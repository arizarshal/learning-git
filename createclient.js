'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  UserPlusIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  XMarkIcon,
  CheckIcon,
  ChartBarIcon,
  PlusIcon,
  UserIcon,
  DocumentTextIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import {
  createClient,
  updateClient,
  fetchClients,
  fetchClientById,
  getPushCredentials,
  calculatePushLimits,
  uploadCrmExcelFiles,
  deleteCrmExcelFile
} from '@/axiosApis/clients/clientApi';
import { getAllUsers } from '@/axiosApis/user/userApi';  //Configuration API
import { getExportTemplates } from '@/axiosApis/leads/leadApi';
import { getCurrentUser } from '@/utils/permissions';
import { fetchColleges, fetchCoursesByCollege, fetchCoursesByProgrammes, fetchStates, fetchCities, fetchCitiesByState } from '@/axiosApis/colleges/collegeApi';
import { getUserDisplayLabel, getUserIdentifier } from './ClientHelper';
import { 
  CLIENT_SECTIONS, 
  CLIENT_SECTION_ACCESS,
  ROLE_PERMISSIONS,
  getClientSectionAccess, 
  canAccessClientSection,
  canCreateClient,
  canUpdateClient,
  canDeleteClient,
  isTestOnlyClient,
  normalizeRole,
  PERMISSIONS
} from '@/utils/rbacPermissions';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { usePermissions } from '@/contexts/PermissionContext';


// REFACTORING
import Campaign from './helper/steps/Campaign'
import Configuration from './helper/steps/Configuration'
import AdApproval from './helper/steps/AdApproval'
import ApiConfig from './helper/steps/ApiConfig'



// REFACTORING IMPORTS
import SectionPermissionWrapper from './helper/shared/SectionPermissionWrapper';
import { ClientFormContext, ClientFormProvider } from './helper/contexts/ClientFormContext';
import { CLIENT_INITIAL_STATE } from './helper/constants/clientInitialState';
// Hook



const normalizeRoleId = (role = '') =>
  role
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

// Calculate months between two dates (inclusive of start month)
const getMonthsBetweenDates = (startDate, endDate) => {
  if (!startDate || !endDate) return [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) return [];
  
  const months = [];
  const current = new Date(start);
  // Start from the active date month itself
  current.setDate(1); // Set to first day of month for consistency
  
  while (current <= end) {
    months.push({
      key: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
      label: current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    });
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
};

const REPORTING_ROLE_ALIASES = new Map([
  ['sales-team', 'sales-team'],
  ['salesteam', 'sales-team'],
  ['sales team', 'sales-team'],
  ['sales', 'sales-team'],
  // ['ops-team', 'ops-team'],
  // ['opsteam', 'ops-team'],
  // ['ops team', 'ops-team'],
  ['operation-team', 'ops-team'],
  ['operations-team', 'ops-team'],
  ['operations', 'ops-team'],
  // ['product-lead', 'product-lead'],
  // ['productlead', 'product-lead'],
  // ['product lead', 'product-lead'],
  // ['product', 'product-lead'],
  // ['delivery-manager', 'delivery-manager'],
  // ['deliverymanager', 'delivery-manager'],
  // ['delivery manager', 'delivery-manager'],
  // ['delivery', 'delivery-manager'],


]);

const REPORTING_ROLE_LABELS = new Map([
  ['sales-team', 'Sales Team'],
  ['ops-team', 'Operations Team'],
  ['product-lead', 'Product Lead'],
  ['delivery-manager', 'Delivery Manager']
]);

const getCanonicalReportingRole = (role) => {
  const normalized = normalizeRoleId(role);
  if (!normalized) {
    return null;
  }
  return REPORTING_ROLE_ALIASES.get(normalized) || null;
};

const getReportingRoleLabel = (canonicalRole) =>
  REPORTING_ROLE_LABELS.get(canonicalRole) || '';

const formatRoleForDisplay = (role) => {
  if (!role) {
    return '';
  }
  return role
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};



const DELIVERY_MANAGER_ALLOWED_ROLES = new Set([
  // 'sales-team',
  // 'product-lead',
  // 'campaign-manager',
  // 'sales-manager',
  'api-integration',
  'api-integrator',
  'campaign',
  'campaign-manager',
  'ad-manager'
]);

export default function CreateClient() {

  const { user } = useAuthContext();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 CreateClient - User Data:', {
      userRole: user?.userRole || user?.role?.role,
      roleId: user?.roleId,
      permissions: user?.permissions?.permissions || user?.permissions || [],
      user: user
    });
    // console.log('🔑 Section Permissions:', sectionPermissions);
    console.log('✅ Has clients.create.all?', hasPermission(PERMISSIONS.CLIENTS.CREATE_ALL));
    console.log('✅ Has clients.create.limited?', hasPermission(PERMISSIONS.CLIENTS.CREATE_LIMITED));
  }, [user, hasPermission]);
  
  // Check for edit mode from URL parameter
  const editClientId = searchParams.get('edit');
  const [editClientLoading, setEditClientLoading] = useState(false);
  
  const [formData, setFormData] = useState(CLIENT_INITIAL_STATE);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [colleges, setColleges] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(false);
  const [collegesError, setCollegesError] = useState('');
  const [collegeSearchTerm, setCollegeSearchTerm] = useState('');
  const [exportTemplates, setExportTemplates] = useState([]);// campaign API
  const [templatesLoading, setTemplatesLoading] = useState(false); //Campaign API & Api Config
  const [locationOptions, setLocationOptions] = useState({
    states: [],
    cities: [],
    topStates: [],
    topCities: []
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(''); //Campaign API
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [loadedStateIds, setLoadedStateIds] = useState(new Set());
  const [courseOptions, setCourseOptions] = useState([]);
  const [courseLevels, setCourseLevels] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [coursesNotice, setCoursesNotice] = useState('');
  const [selectedCourseLevelIds, setSelectedCourseLevelIds] = useState([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [reportingUsers, setReportingUsers] = useState([]);
  const [reportingUsersLoading, setReportingUsersLoading] = useState(false);
  const [reportingUsersError, setReportingUsersError] = useState('');
  const [reportingUserSearch, setReportingUserSearch] = useState('');
  const [selectedReportingUserIds, setSelectedReportingUserIds] = useState([]);
  const [deliveryManagerSearch, setDeliveryManagerSearch] = useState('');
  const [selectedDeliveryManagerIds, setSelectedDeliveryManagerIds] = useState([]);
  const [pushCredentialsLoading, setPushCredentialsLoading] = useState(false);
  const [pushCredentialsError, setPushCredentialsError] = useState('');
  const [pushCredentialsMessage, setPushCredentialsMessage] = useState('');
  const [selectedTopCities, setSelectedTopCities] = useState([]);
  const [selectedTopStates, setSelectedTopStates] = useState([]);
  const [priorityCitySearchTerm, setPriorityCitySearchTerm] = useState('');
  const [priorityCitiesLoading, setPriorityCitiesLoading] = useState(false);
  const [filteredPriorityCitiesFromApi, setFilteredPriorityCitiesFromApi] = useState([]);
  const [coursePushLimits, setCoursePushLimits] = useState({});
  const [courseMappings, setCourseMappings] = useState({});
  const [activeSection, setActiveSection] = useState('basic'); // basic, config, approval, api
  const [selectedAdStates, setSelectedAdStates] = useState([]);
  const [selectedAdCities, setSelectedAdCities] = useState([]);
  const [selectedGoogleAdStates, setSelectedGoogleAdStates] = useState([]);
  const [selectedGoogleAdCities, setSelectedGoogleAdCities] = useState([]);
  const [selectedMetaAdStates, setSelectedMetaAdStates] = useState([]);
  const [selectedMetaAdCities, setSelectedMetaAdCities] = useState([]);
  const [selectedBingAdStates, setSelectedBingAdStates] = useState([]);
  const [selectedBingAdCities, setSelectedBingAdCities] = useState([]);
  const [limitCalculation, setLimitCalculation] = useState({
    totalCourseLimits: 0,
    remainingTotal: null,
    remainingDaily: null,
    hasError: false,
    errorMessage: null
  });
  const [currentStep, setCurrentStep] = useState(0); // 0: basic, 1: config, 2: approval, 3: api
  const [completedSteps, setCompletedSteps] = useState([]);
  const [pendingClients, setPendingClients] = useState([]);
  const [monthsArray, setMonthsArray] = useState([]);  //Campaign API
  const [pendingClientsLoading, setPendingClientsLoading] = useState(false); //Campaign API
  const [showPendingClients, setShowPendingClients] = useState(true);
  const [excelData, setExcelData] = useState(null);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [excelUploadError, setExcelUploadError] = useState('');
  // CRM Excel Files - separate pending uploads and saved files
  const [crmExcelFilesToUpload, setCrmExcelFilesToUpload] = useState([]); // Files to be uploaded
  const [savedCrmExcelFiles, setSavedCrmExcelFiles] = useState([]); // Files already saved on backend
  const [apiExcelUploadError, setApiExcelUploadError] = useState('');
  const apiExcelInputRef = useRef(null);
  
  // Branding Files - separate from CRM files
  const [brandingFilesToUpload, setBrandingFilesToUpload] = useState([]);  //Campaign API
  const [savedBrandingFiles, setSavedBrandingFiles] = useState([]);  //Campaign API
  const [brandingUploadError, setBrandingUploadError] = useState('');
  const brandingFileInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const courseRequestIdRef = useRef(0);
  const catalogCourseNamesRef = useRef(new Set());

  // Daily delivery tracking modal state
  const [showDailyDeliveryModal, setShowDailyDeliveryModal] = useState(false);
  const [currentDeliveryChannel, setCurrentDeliveryChannel] = useState(''); // 'email', 'message', 'whatsapp'
  const [dailyDeliveryDate, setDailyDeliveryDate] = useState('');
  const [dailyDeliveryAmount, setDailyDeliveryAmount] = useState('');
  const [dailyDeliveryOpens, setDailyDeliveryOpens] = useState('');
  const [dailyDeliveryLeadsDelivered, setDailyDeliveryLeadsDelivered] = useState('');

  // Determine if we're in edit mode (updating existing client)
  const isEditMode = formData.id != null;
  
  // Get user's section permissions - now using BOTH hardcoded config AND dynamic backend permissions
  const sectionPermissions = useMemo(() => {
    const defaultPerms = { create: [], update: [], view: [], delete: false, testOnly: false };
    if (!user) return defaultPerms;
    
    const userRole = user?.userRole || user?.role?.role;
    if (!userRole) return defaultPerms;
    
    const normalized = normalizeRole(userRole);
    
    // Try direct lookup first from hardcoded config
    let access = CLIENT_SECTION_ACCESS[normalized];
    
    // If not found, try case-insensitive search
    if (!access && normalized) {
      const normalizedLower = normalized.toLowerCase();
      for (const [key, value] of Object.entries(CLIENT_SECTION_ACCESS)) {
        if (key?.toLowerCase() === normalizedLower) {
          access = value;
          break;
        }
      }
    }
    
    // Fallback: Check ROLE_PERMISSIONS.clientSections if available
    if (!access && normalized) {
      const roleConfig = ROLE_PERMISSIONS[normalized];
      if (roleConfig?.clientSections) {
        access = {
          ...roleConfig.clientSections,
          delete: CLIENT_SECTION_ACCESS[normalized]?.delete || false,
          testOnly: CLIENT_SECTION_ACCESS[normalized]?.testOnly || false
        };
      }
    }
    
    const baseAccess = access || defaultPerms;
    
    // ENHANCEMENT: Check actual backend permissions to expand access
    // If user has clients.create.all, add ALL sections to create array
    const hasCreateAll = hasPermission(PERMISSIONS.CLIENTS.CREATE_ALL);
    const hasCreateLimited = hasPermission(PERMISSIONS.CLIENTS.CREATE_LIMITED);
    const hasCreateTest = hasPermission(PERMISSIONS.CLIENTS.CREATE_TEST);
    
    if (hasCreateAll || hasCreateLimited) {
      // User has create permissions from backend - grant access to all sections
      const allSections = Object.values(CLIENT_SECTIONS);
      return {
        create: allSections,
        update: [...new Set([...baseAccess.update, ...allSections])],
        view: [...new Set([...baseAccess.view, ...allSections])],
        delete: baseAccess.delete,
        testOnly: hasCreateTest && !hasCreateAll && !hasCreateLimited
      };
    }
    
    return baseAccess;
  }, [user, hasPermission]);
  
  // Check if user is Admin or Sales Head (can toggle Sales Head Approval)
  const canToggleSalesHeadApproval = useMemo(() => {
    const userRole = user?.userRole || user?.role?.role || '';
    const normalized = userRole.toString().trim().toLowerCase().replace(/[\s_]+/g, '-');
    return normalized === 'admin' || normalized === 'super-admin' || normalized === 'sales-head';
  }, [user]);
  
  // Check if user can access a section for a specific action
  const canAccess = useCallback((section, action = 'view') => {
    const sections = sectionPermissions[action] || [];
    return sections.includes(section);
  }, [sectionPermissions]);
  
  // Check if user can edit a section (based on create or update mode)
  const canEdit = useCallback((section) => {
    if (isEditMode) {
      // For existing clients, check update permission
      return canAccess(section, 'update');
    } else {
      // For new clients, check create permission
      return canAccess(section, 'create');
    }
  }, [canAccess, isEditMode]);


  const loadLocations = useCallback(async () => {
    setLocationLoading(true);
    setLocationError('');
    try {
      // Only fetch states initially - cities will be loaded on-demand
      const statesResult = await fetchStates();
      
      if (statesResult.success) {
        // Map states with id and name
        const statesData = (statesResult.data || []).map(state => ({
          id: state.id,
          name: state.name
        }));
        
        setLocationOptions({
          states: statesData,
          cities: [], // Don't load all cities upfront
          topStates: [],
          topCities: []
        });
        console.log('✅ Loaded states:', statesData.length);
      } else {
        setLocationOptions({ states: [], cities: [], topStates: [], topCities: [] });
        const errorMessage = statesResult.message || 'Failed to fetch states';
        setLocationError(errorMessage);
        console.error('Failed to fetch states:', errorMessage);
      }
    } catch (error) {
      console.error('Error fetching states:', error);
      setLocationOptions({ states: [], cities: [], topStates: [], topCities: [] });
      setLocationError('Failed to fetch states');
    } finally {
      setLocationLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 
  const loadReportingUsers = useCallback(async () => {
    setReportingUsersLoading(true);
    setReportingUsersError('');
    try {
      // Pass forReportingPanel: true to include upper roles (Admin, Sales Head, Ops Head, API Integrator)
      // even for users who normally can't see them
      const result = await getAllUsers({ page: 1, limit: 500, forReportingPanel: true });
      if (result.success) {
        const rawUsers = Array.isArray(result.data?.users)
          ? result.data.users
          : Array.isArray(result.data)
            ? result.data
            : [];

        // Roles to EXCLUDE from both reporting and delivery
        // const EXCLUDED_ROLES = [
        //   'admin', 'super-admin', 'superadmin', 'super admin',
        // ];

        const normalizedUsers = (rawUsers || [])
          .map((user) => {
            const id = getUserIdentifier(user);
            if (!id) {
              return null;
            }

            const rawRoleValue = user?.userRole || user?.role || '';
            const canonicalRole = getCanonicalReportingRole(rawRoleValue);
            const displayRole = canonicalRole
              ? getReportingRoleLabel(canonicalRole) || formatRoleForDisplay(canonicalRole)
              : formatRoleForDisplay(rawRoleValue);

            return {
              id,
              name: user?.name || '',
              username: user?.username || '', 
              email: user?.email || '',
              role: rawRoleValue,
              canonicalRole,
              displayRole,
              raw: user
            };
          })
          .filter(Boolean)
          .filter((user) => {
            const normalizedRole = (user.role || '')
              .toString()
              .toLowerCase()
              .replace(/[_\s]+/g, '-');
            return ((excluded) => {
              const normalizedExcluded = excluded.toLowerCase().replace(/[_\s]+/g, '-');
              return normalizedRole === normalizedExcluded || normalizedRole.includes(normalizedExcluded);
            });
          })
        setReportingUsers(normalizedUsers);
        
        // Auto-select upper roles, API Integrator, and current user
        const currentUser = getCurrentUser();
        const currentUserId = currentUser?.id || currentUser?._id || currentUser?.userId;
        const autoSelectRoles = [
          'admin', 'super-admin',
          'ops-head', 'operations-head', 'ops head', 'operations head', 'opshead',
          'sales-head', 'sales head', 'saleshead',
          'api-integrator', 'api integrator', 'apiintegrator', 'api-integration',
          'operations-team', 'sales-team',
          // 'sales-head', 'sale-head', 'saleshead', 'sales head',
          // 'operation-manager', 'operations-manager', 'operation manager', 'operations manager',
          // 'sale-manager', 'sales-manager', 'sale manager', 'sales manager',
          // 'ad-executive', 'ad executive', 'adexecutive',
          // 'ad-manager', 'admanager', 'ad manager'
        ];
        
        const usersToAutoSelect = normalizedUsers.filter(user => {
          // Check if user has an upper role
          const normalizedRole = (user.role || '').toLowerCase().replace(/[_\s]+/g, '-');
          const canonicalRole = (user.canonicalRole || '').toLowerCase();
          
          const isUpperRole = autoSelectRoles.some(role => {
            const normalizedAutoRole = role.replace(/[\s]+/g, '-');
            return normalizedRole.includes(normalizedAutoRole) || 
                   canonicalRole.includes(normalizedAutoRole) ||
                   normalizedRole === normalizedAutoRole ||
                   canonicalRole === normalizedAutoRole;
          });


          
          // Check if user is the current logged-in user
          const isCurrentUser = currentUserId && (
            user.id === String(currentUserId) || 
            user.raw?.id === currentUserId ||
            user.raw?._id === currentUserId ||
            user.raw?.userId === currentUserId
          );
          
          return isUpperRole || isCurrentUser;
        });
        
        const autoSelectedIds = usersToAutoSelect.map(user => user.id);
        if (autoSelectedIds.length > 0) {
          setSelectedReportingUserIds(prev => {
            // Only set if no users are already selected (first load)
            if (prev.length === 0) {
              return autoSelectedIds;
            }
            return prev;
          });
        }
      } else {
        setReportingUsers([]);
        const errorMessage = result.message || 'Failed to fetch CMS users';
        setReportingUsersError(errorMessage);
        console.error('Failed to fetch CMS users:', errorMessage);
      }
    } catch (error) {
      console.error('Error fetching CMS users:', error);
      setReportingUsers([]);
      setReportingUsersError('Failed to fetch CMS users');
    } finally {
      setReportingUsersLoading(false);
    }
  }, []);




  const loadPendingClients = useCallback(async () => {
    setPendingClientsLoading(true);
    try {
      const result = await fetchClients({ status: 'Pending', limit: 10 });
      console.log('Pending clients API result:', result);
      if (result.success) {
        // result.data is already the array of clients from the API
        const clients = Array.isArray(result.data) ? result.data : [];
        console.log('All pending clients:', clients);
        // Filter only clients with incomplete stages (completionStage < 4)
        const incompleteClients = clients.filter(client => 
          (client.completionStage || 0) < 4
        );
        console.log('Filtered incomplete clients:', incompleteClients);
        setPendingClients(incompleteClients);
      } else {
        setPendingClients([]);
      }
    } catch (error) {
      // Silently handle error - pending clients feature is optional
      console.warn('Could not load pending clients (this is normal if migration has not been run):', error.message);
      setPendingClients([]);
    } finally {
      setPendingClientsLoading(false);
    }
  }, []);

  const filteredCities = useMemo(() => {
    if (!selectedStateId) {
      return locationOptions.cities;
    }
    return locationOptions.cities.filter((city) => {
      if (!city.stateId) {
        return false;
      }
      return String(city.stateId) === selectedStateId;
    });
  }, [selectedStateId, locationOptions.cities]);

  const stateIdToName = useMemo(() => {
    const map = new Map();
    if (Array.isArray(locationOptions.states)) {
      locationOptions.states.forEach((state) => {
        if (!state || state.id == null) {
          return;
        }
        const id = String(state.id);
        if (!map.has(id)) {
          map.set(id, state.name || '');
        }
      });
    }
    return map;
  }, [locationOptions.states]);

  const stateNameToIds = useMemo(() => {
    const map = new Map();
    if (Array.isArray(locationOptions.states)) {
      locationOptions.states.forEach((state) => {
        const normalizedName = state?.name?.trim().toLowerCase();
        if (!normalizedName || state?.id == null) {
          return;
        }
        const id = String(state.id);
        if (!map.has(normalizedName)) {
          map.set(normalizedName, [id]);
        } else if (!map.get(normalizedName).includes(id)) {
          map.get(normalizedName).push(id);
        }
      });
    }
    return map;
  }, [locationOptions.states]);

  const topStateOptions = useMemo(() => {
    if (!Array.isArray(locationOptions.topStates) || !Array.isArray(locationOptions.states)) {
      return [];
    }

    const stateLookup = new Map();
    locationOptions.states.forEach((state) => {
      const normalizedName = state?.name?.trim().toLowerCase();
      if (!normalizedName) {
        return;
      }
      if (!stateLookup.has(normalizedName)) {
        stateLookup.set(normalizedName, state);
      }
    });

    const dedupe = new Set();
    return locationOptions.topStates
      .slice(0, 10)
      .map((entry) => {
        const normalizedName = entry?.name?.trim().toLowerCase();
        if (!normalizedName) {
          return null;
        }

        const matchedState = stateLookup.get(normalizedName);
        if (!matchedState || !matchedState.id) {
          return null;
        }

        const stateId = String(matchedState.id);
        if (dedupe.has(stateId)) {
          return null;
        }
        dedupe.add(stateId);

        return {
          id: stateId,
          name: matchedState.name,
          total: typeof entry.total === 'number' ? entry.total : null
        };
      })
      .filter(Boolean);
  }, [locationOptions.topStates, locationOptions.states]);

  const topStateIdSet = useMemo(() => new Set(topStateOptions.map((state) => state.id)), [topStateOptions]);

  const remainingStateOptions = useMemo(() => {
    if (!Array.isArray(locationOptions.states)) {
      return [];
    }
    if (!topStateIdSet.size) {
      return locationOptions.states;
    }
    return locationOptions.states.filter((state) => !topStateIdSet.has(String(state.id)));
  }, [locationOptions.states, topStateIdSet]);

  const topCityOptions = useMemo(() => {
    if (!Array.isArray(locationOptions.topCities) || !Array.isArray(locationOptions.cities)) {
      return [];
    }

    const cityLookup = new Map();
    locationOptions.cities.forEach((city) => {
      const normalizedName = city?.name?.trim().toLowerCase();
      if (!normalizedName) {
        return;
      }
      const bucketKey = `${normalizedName}|${city?.stateId ? String(city.stateId) : ''}`;
      if (!cityLookup.has(bucketKey)) {
        cityLookup.set(bucketKey, city);
      }
      if (!cityLookup.has(normalizedName)) {
        cityLookup.set(normalizedName, city);
      }
    });

    const dedupe = new Set();
    return locationOptions.topCities
      .slice(0, 10)
      .map((entry) => {
        const normalizedName = entry?.name?.trim().toLowerCase();
        if (!normalizedName) {
          return null;
        }
        const stateKey = entry?.state ? entry.state.trim().toLowerCase() : '';

        let matchedCity = null;
        if (stateKey) {
          const candidateStateIds = stateNameToIds.get(stateKey) || [];
          for (const candidateId of candidateStateIds) {
            const lookupKey = `${normalizedName}|${candidateId}`;
            matchedCity = cityLookup.get(lookupKey);
            if (matchedCity) {
              break;
            }
          }
        }

        if (!matchedCity) {
          matchedCity = cityLookup.get(normalizedName);
        }

        if (!matchedCity || !matchedCity.id) {
          return null;
        }

        const cityId = String(matchedCity.id);
        if (dedupe.has(cityId)) {
          return null;
        }
        dedupe.add(cityId);

        return {
          id: cityId,
          name: matchedCity.name,
          stateName: stateIdToName.get(String(matchedCity.stateId)) || entry?.state || '',
          total: typeof entry?.total === 'number' ? entry.total : null
        };
      })
      .filter(Boolean);
  }, [locationOptions.topCities, locationOptions.cities, stateIdToName, stateNameToIds]);

  const topCityIdSet = useMemo(() => new Set(topCityOptions.map((city) => city.id)), [topCityOptions]);

  const defaultCityOptions = useMemo(() => {
    if (!Array.isArray(locationOptions.cities)) {
      return [];
    }
    if (!topCityIdSet.size) {
      return locationOptions.cities;
    }
    return locationOptions.cities.filter((city) => !topCityIdSet.has(String(city.id)));
  }, [locationOptions.cities, topCityIdSet]);

  const loadCitiesByState = useCallback(async (stateId) => {
    if (!stateId) {
      return;
    }

    // Avoid reloading if we've already loaded cities for this state
    if (loadedStateIds.has(stateId)) {
      return;
    }

    setCitiesLoading(true);
    try {
      const result = await fetchCitiesByState(stateId, '');
      
      if (result.success) {
        const citiesData = (result.data || []).map(city => ({
          id: city.id,
          name: city.name,
          stateId: city.state_id || city.stateId || stateId
        }));

        setLocationOptions(prev => {
          // Merge with existing cities from other states
          const existingCities = prev.cities.filter(c => c.stateId !== stateId);
          const allCities = [...existingCities, ...citiesData];
          
          // Remove duplicates by id
          const uniqueCities = Array.from(
            new Map(allCities.map(city => [city.id, city])).values()
          );

          return {
            ...prev,
            cities: uniqueCities
          };
        });

        setLoadedStateIds(prev => new Set([...prev, stateId]));

        console.log(`✅ Loaded ${citiesData.length} cities for state ${stateId}`);
      }
    } catch (error) {
      console.error('Error loading cities by state:', error);
    } finally {
      setCitiesLoading(false);
    }
  }, [loadedStateIds]);


  // Fetch cities for priority section when states are selected or search term changes
  useEffect(() => {
    let timeoutId;
    
    const fetchPriorityCities = async () => {
      if (selectedTopStates.length === 0) {
        setFilteredPriorityCitiesFromApi([]);
        return;
      }
      
      setPriorityCitiesLoading(true);
      try {
        // Get state IDs for selected priority states
        const stateIds = selectedTopStates.map(stateName => {
          const state = locationOptions.states.find(
            s => s.name?.toLowerCase() === stateName.toLowerCase()
          );
          return state ? state.id : null;
        }).filter(id => id !== null);
        
        if (stateIds.length === 0) {
          setFilteredPriorityCitiesFromApi([]);
          setPriorityCitiesLoading(false);
          return;
        }
        
        // Fetch cities for each selected state with search term
        const citiesPromises = stateIds.map(stateId => 
          fetchCitiesByState(stateId, priorityCitySearchTerm)
        );
        
        const citiesResults = await Promise.all(citiesPromises);
        
        // Combine all cities from all states
        const allStateCities = citiesResults.reduce((acc, result) => {
          if (result.success && result.data) {
            return [...acc, ...result.data.map(city => ({
              id: city.id,
              name: city.name,
              stateId: city.state_id || city.stateId
            }))];
          }
          return acc;
        }, []);
        
        // Remove duplicates based on city id
        const uniqueCities = Array.from(
          new Map(allStateCities.map(city => [city.id, city])).values()
        );
        
        setFilteredPriorityCitiesFromApi(uniqueCities);
      } catch (error) {
        console.error('Failed to fetch priority cities:', error);
        setFilteredPriorityCitiesFromApi([]);
      } finally {
        setPriorityCitiesLoading(false);
      }
    };
    
    // Debounce the API call for city search
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fetchPriorityCities();
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [selectedTopStates, locationOptions.states, priorityCitySearchTerm]);

  // Use all cities and states since we removed the predefined lists
  const cityOptionsToRender = selectedStateId ? filteredCities : locationOptions.cities;
  const stateOptionsToRender = locationOptions.states;

  

  const courseLevelsById = useMemo(() => {
    const map = new Map();
    courseLevels.forEach((level) => {
      if (level?.id) {
        map.set(String(level.id), level);
      }
    });
    return map;
  }, [courseLevels]);

  const selectedCourseSet = useMemo(() => {
    const entries = Array.isArray(formData.courses) ? formData.courses : [];
    return new Set(
      entries
        .map((course) => course?.toString().trim().toLowerCase())
        .filter((value) => Boolean(value))
    );
  }, [formData.courses]);

  const uncategorizedCourseCount = useMemo(
    () => courseOptions.filter((course) => !course?.courseLevelId).length,
    [courseOptions]
  );

  const groupedCourses = useMemo(() => {
    const searchTerm = courseSearch.trim().toLowerCase();

    const levelFilterSet = new Set((selectedCourseLevelIds || []).map((id) => String(id)));
    const groups = new Map();

    const ensureGroup = (levelKey, levelMeta = {}) => {
      if (!groups.has(levelKey)) {
        groups.set(levelKey, {
          levelId: levelKey,
          levelName: levelMeta.name || (levelKey === 'unassigned' ? 'Other Programs' : `Level ${levelKey}`),
          levelDescription: levelMeta.description || '',
          courses: []

        });
      }
      return groups.get(levelKey);
    };

    courseOptions.forEach((course) => {
      if (!course || !course.name) {
        return;
      }

      const courseName = course.name.trim();
      if (!courseName) {
        return;
      }

      const normalizedLevelId = course.courseLevelId ? String(course.courseLevelId) : 'unassigned';

      if (levelFilterSet.size) {
        if (normalizedLevelId === 'unassigned') {
          if (!levelFilterSet.has('unassigned')) {
            return;
          }
        } else if (!levelFilterSet.has(normalizedLevelId)) {
          return;
        }
      }

      if (searchTerm && !courseName.toLowerCase().includes(searchTerm)) {
        return;
      }

      const meta = courseLevelsById.get(normalizedLevelId) || null;
      const group = ensureGroup(normalizedLevelId, meta || {});

      group.courses.push(course);
    });

    groups.forEach((group) => {
      group.courses.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });

    const orderedGroups = [];
    const levelOrder = courseLevels.map((level) => String(level.id));
    const baseOrder = selectedCourseLevelIds.length ? selectedCourseLevelIds : levelOrder;

    baseOrder.forEach((levelId) => {
      const key = String(levelId);
      if (groups.has(key)) {
        orderedGroups.push(groups.get(key));
        groups.delete(key);
      }
    });

    if (groups.has('unassigned')) {
      orderedGroups.push(groups.get('unassigned'));
      groups.delete('unassigned');
    }

    const remainingGroups = Array.from(groups.values()).sort((a, b) =>
      (a.levelName || '').localeCompare(b.levelName || '')
    );

    return [...orderedGroups, ...remainingGroups];
  }, [
    courseOptions,
    courseLevels,
    courseLevelsById,
    selectedCourseLevelIds,
    courseSearch
  ]);

  const hasCourseSearch = Boolean(courseSearch.trim());

  const reportingUsersById = useMemo(() => {
    const map = new Map();
    reportingUsers.forEach((user) => {
      if (!user || user.id == null) {
        return;
      }
      const id = String(user.id);
      if (!map.has(id)) {
        map.set(id, user);
      }
    });
    return map;
  }, [reportingUsers]);

  const filteredReportingUsers = useMemo(() => {
    const list = Array.isArray(reportingUsers) ? reportingUsers : [];
    if (!list.length) {
      return [];
    }

    const term = reportingUserSearch.trim().toLowerCase();
    if (!term) {
      return list.slice(0, 50);
    }

    return list
      .filter((user) => {
        const label = getUserDisplayLabel(user).toLowerCase();
        const email = user.email ? String(user.email).toLowerCase() : '';
        const username = user.username ? String(user.username).toLowerCase() : '';
        const role = user.role ? String(user.role).toLowerCase() : '';
        const displayRole = user.displayRole ? String(user.displayRole).toLowerCase() : '';
        const canonicalRole = user.canonicalRole ? String(user.canonicalRole).toLowerCase() : '';
        return (
          label.includes(term) ||
          email.includes(term) ||
          username.includes(term) ||
          role.includes(term) ||
          displayRole.includes(term) ||
          canonicalRole.includes(term)
        );
      })
      .slice(0, 50);
  }, [reportingUsers, reportingUserSearch]);

  const selectedReportingUserSet = useMemo(
    () => new Set(selectedReportingUserIds.map((id) => String(id))),
    [selectedReportingUserIds]
  );

  const selectedReportingUsers = useMemo(
    () =>
      selectedReportingUserIds
        .map((id) => reportingUsersById.get(String(id)))
        .filter(Boolean),
    [selectedReportingUserIds, reportingUsersById]
  );


   const deliveryManagerOptions = useMemo(
    () =>
      reportingUsers.filter((user) => {
        // reportingUsers already has admins filtered out
        // Just filter to delivery-allowed roles
        const normalizedRole = (user.role || '')
          .toString()
          .toLowerCase()
          .replace(/[_\s]+/g, '-');

        const DELIVERY_ALLOWED = [
          'api-integration', 'api-integrator', 'api integrator', 'api integration',
          'campaign', 'campaign-manager', 'campaign manager', 'campaignmanager',
          'ad-manager', 'ad manager', 'admanager',
        ];

        return DELIVERY_ALLOWED.some((allowed) => {
          const normalizedAllowed = allowed.toLowerCase().replace(/[_\s]+/g, '-');
          return normalizedRole === normalizedAllowed || normalizedRole.includes(normalizedAllowed);
        });
      }),
    [reportingUsers]
  );

  // const deliveryManagerOptions = useMemo(
  //   () =>
  //     reportingUsers.filter((user) => {
  //       const canonicalRole = user.canonicalRole ? String(user.canonicalRole).toLowerCase() : '';
  //       return canonicalRole && DELIVERY_MANAGER_ALLOWED_ROLES.has(canonicalRole);
  //     }),
  //   [reportingUsers]
  // );

  const deliveryManagersById = useMemo(() => {
    const map = new Map();
    deliveryManagerOptions.forEach((user) => {
      if (!user || user.id == null) {
        return;
      }
      const id = String(user.id);
      if (!map.has(id)) {
        map.set(id, user);
      }
    });
    return map;
  }, [deliveryManagerOptions]);

  const filteredDeliveryManagerOptions = useMemo(() => {
    const list = Array.isArray(deliveryManagerOptions) ? deliveryManagerOptions : [];
    if (!list.length) {
      return [];
    }

    const term = deliveryManagerSearch.trim().toLowerCase();
    if (!term) {
      return list.slice(0, 50);
    }

    return list
      .filter((user) => {
        const label = getUserDisplayLabel(user).toLowerCase();
        const email = user.email ? String(user.email).toLowerCase() : '';
        const username = user.username ? String(user.username).toLowerCase() : '';
        const role = user.role ? String(user.role).toLowerCase() : '';
        const displayRole = user.displayRole ? String(user.displayRole).toLowerCase() : '';
        const canonicalRole = user.canonicalRole ? String(user.canonicalRole).toLowerCase() : '';
        return (
          label.includes(term) ||
          email.includes(term) ||
          username.includes(term) ||
          role.includes(term) ||
          displayRole.includes(term) ||
          canonicalRole.includes(term)
        );
      })
      .slice(0, 50);
  }, [deliveryManagerOptions, deliveryManagerSearch]);

  const selectedDeliveryManagerUsers = useMemo(
    () =>
      selectedDeliveryManagerIds
        .map((id) => deliveryManagersById.get(String(id)))
        .filter(Boolean),
    [selectedDeliveryManagerIds, deliveryManagersById]
  );

  const selectedDeliveryManagerSet = useMemo(
    () => new Set(selectedDeliveryManagerIds.map((id) => String(id))),
    [selectedDeliveryManagerIds]
  );

  const syncDeliveryExecutives = useCallback(
    (ids = []) => {
      const labels = (ids || [])
        .map((id) => deliveryManagersById.get(String(id)))
        .filter(Boolean)
        .map((user) => getUserDisplayLabel(user));
      const joined = labels.join(', ');
      setFormData((prev) => (prev.deliveryExecutive === joined ? prev : { ...prev, deliveryExecutive: joined }));
    },
    [deliveryManagersById, setFormData]
  );


    const loadColleges = useCallback(async () => {
    setCollegesLoading(true);
    setCollegesError('');
    try {
      const result = await fetchColleges();
      if (result.success) {
        setColleges(result.data || []);
      } else {
        setColleges([]);
        const errorMessage = result.message || 'Failed to fetch colleges';
        setCollegesError(errorMessage);
        console.error('Failed to fetch colleges:', errorMessage);
      }
    } catch (error) {
      console.error('Error fetching colleges:', error);
      setColleges([]);
      setCollegesError('Failed to fetch colleges');
    } finally {
      setCollegesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const validIds = selectedReportingUserIds.filter((id) =>
      reportingUsersById.has(String(id))
    );

    if (validIds.length !== selectedReportingUserIds.length) {
      setSelectedReportingUserIds(validIds);
      return;
    }

    const labels = validIds
      .map((id) => reportingUsersById.get(String(id)))
      .filter(Boolean)
      .map((user) => getUserDisplayLabel(user));

    const nextValue = labels.join(', ');
    setFormData((prev) => (prev.reportingPanel === nextValue ? prev : { ...prev, reportingPanel: nextValue }));
  }, [selectedReportingUserIds, reportingUsersById]);

  useEffect(() => {
    const validIds = selectedDeliveryManagerIds.filter((id) =>
      deliveryManagersById.has(String(id))
    );

    if (validIds.length !== selectedDeliveryManagerIds.length) {
      setSelectedDeliveryManagerIds(validIds);
      syncDeliveryExecutives(validIds);
    }
  }, [selectedDeliveryManagerIds, deliveryManagersById, syncDeliveryExecutives]);

  useEffect(() => {
    // Handle deliveryExecutive as both string and array
    const deliveryExec = formData.deliveryExecutive || '';
    const deliveryExecStr = Array.isArray(deliveryExec) ? deliveryExec.join(',') : deliveryExec;
    const existing = deliveryExecStr
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);

    if (!existing.length) {
      if (selectedDeliveryManagerIds.length) {
        setSelectedDeliveryManagerIds([]);
      }
      return;
    }

    const matchedIds = [];
    deliveryManagerOptions.forEach((user) => {
      const label = getUserDisplayLabel(user).toLowerCase();
      if (existing.includes(label)) {
        matchedIds.push(String(user.id));
      }
    });

    const uniqueMatchedIds = Array.from(new Set(matchedIds));
    const sortedCurrent = [...selectedDeliveryManagerIds].sort();
    const sortedNext = [...uniqueMatchedIds].sort();

    const isSameLength = sortedCurrent.length === sortedNext.length;
    const isSameSelection =
      isSameLength && sortedCurrent.every((value, index) => value === sortedNext[index]);

    if (!isSameSelection) {
      setSelectedDeliveryManagerIds(uniqueMatchedIds);
    }
  }, [formData.deliveryExecutive, deliveryManagerOptions, selectedDeliveryManagerIds]);


  useEffect(() => {
    loadReportingUsers();
  }, [loadReportingUsers]);

  // Load client for editing when editClientId is present in URL
  const loadClientForEdit = useCallback(async (clientId) => {
    if (!clientId) return;
    
    setEditClientLoading(true);
    try {
      const result = await fetchClientById(clientId);
      if (result.success && result.data) {
        const client = result.data;
        
        // Helper function to format ISO date to YYYY-MM-DD for date inputs
        const formatDateForInput = (dateValue) => {
          if (!dateValue) return '';
          try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
          } catch {
            return '';
          }
        };
        
        // Set form data from client (same as loadPendingClient)
        setFormData({
          ...client,
          id: client.id, // Ensure id is set for edit mode detection
          
          // Normalize nullable string fields
          lpLink: client.lpLink ?? '',
          entranceExamLpLink: client.entranceExamLpLink ?? '',
          adSource: client.adSource ?? '',
          adMedium: client.adMedium ?? '',
          expectedBudget: client.expectedBudget ?? '',
          annualBudget: client.annualBudget ?? '',
          budgetSpentTillNow: client.budgetSpentTillNow ?? '',
          costPerLead: client.costPerLead ?? '',
          targetCPL: client.targetCPL ?? '',
          expectedDelivery: client.expectedDelivery ?? '',
          leadDeliveryTillNow: client.leadDeliveryTillNow ?? '',
          currentMonthDelivery: client.currentMonthDelivery ?? '',
          lastYearDeliveryData: client.lastYearDeliveryData ?? '',


          // OLD CODE
          crmType: client.crmType || '',
          crmId: client.crmId || '',
          crmPassword: client.crmPassword || '',
          crmLink: client.crmLink || '',
          statusReason: client.statusReason || '',
          pendingReasonOther: client.pendingReasonOther || '',
          suspendReason: client.suspendReason || '',
          adCampaign: client.adCampaign || '',
          additionalEmails: Array.isArray(client.additionalEmails) ? client.additionalEmails : [],
          courses: Array.isArray(client.courses) ? client.courses : [],
          pushCourses: Array.isArray(client.pushCourses) ? client.pushCourses : [],
          topCompetitors: Array.isArray(client.topCompetitors) ? client.topCompetitors : [],
          apiFiles: Array.isArray(client.apiFiles) ? client.apiFiles : [],
          deliveryExecutive: Array.isArray(client.deliveryExecutive) ? '' : (client.deliveryExecutive || ''),
          salesHeadApproval: Boolean(client.salesHeadApproval),
          completionStage: client.completionStage || 0,
          // Parse daily deliveries JSON strings
          emailDailyDeliveries: (() => {
            if (Array.isArray(client.emailDailyDeliveries)) return client.emailDailyDeliveries;
            if (typeof client.emailDailyDeliveries === 'string') {
              try { return JSON.parse(client.emailDailyDeliveries) || []; } catch { return []; }
            }
            return [];
          })(),
          messageDailyDeliveries: (() => {
            if (Array.isArray(client.messageDailyDeliveries)) return client.messageDailyDeliveries;
            if (typeof client.messageDailyDeliveries === 'string') {
              try { return JSON.parse(client.messageDailyDeliveries) || []; } catch { return []; }
            }
            return [];
          })(),
          whatsappDailyDeliveries: (() => {
            if (Array.isArray(client.whatsappDailyDeliveries)) return client.whatsappDailyDeliveries;
            if (typeof client.whatsappDailyDeliveries === 'string') {
              try { return JSON.parse(client.whatsappDailyDeliveries) || []; } catch { return []; }
            }
            return [];
          })(),
          // Format dates for HTML date inputs (YYYY-MM-DD format)
          expiryDate: formatDateForInput(client.expiryDate),
          activeDate: formatDateForInput(client.activeDate),
          inactiveDate: formatDateForInput(client.inactiveDate),
          googleAdsStartDate: formatDateForInput(client.googleAdsStartDate),
          googleAdsEndDate: formatDateForInput(client.googleAdsEndDate),
          metaAdsStartDate: formatDateForInput(client.metaAdsStartDate),
          metaAdsEndDate: formatDateForInput(client.metaAdsEndDate),
          bingAdsStartDate: formatDateForInput(client.bingAdsStartDate),
          bingAdsEndDate: formatDateForInput(client.bingAdsEndDate),
        });

        // Set related state
        const savedReportingPanel = Array.isArray(client.reportingPanel) ? client.reportingPanel : [];
        setSelectedReportingUserIds(savedReportingPanel);
        setSelectedDeliveryManagerIds(Array.isArray(client.deliveryExecutive) ? client.deliveryExecutive : []);
        setSelectedTopCities(Array.isArray(client.topCity) ? client.topCity : []);
        setSelectedTopStates(Array.isArray(client.topState) ? client.topState : []);
        setCoursePushLimits(client.coursePushLimit || {});
        setCourseMappings(client.courseMappings || {});
        
        // Set college search term display if college is selected
        if (client.collegeId && colleges.length > 0) {
          const matchedCollege = colleges.find(c => 
            String(c.collegeId) === String(client.collegeId) || 
            String(c.cwId) === String(client.collegeCwId)
          );
          if (matchedCollege) {
            const cwId = matchedCollege.cwId || matchedCollege.collegeId;
            const displayText = `(ID: ${cwId}) ${matchedCollege.name}`;
            setCollegeSearchTerm(displayText);
          } else {
            // If college not found in list, show the cwId or collegeId
            setCollegeSearchTerm(client.collegeCwId || client.collegeId || '');
          }
        } else if (client.collegeCwId || client.collegeId) {
          // Colleges not loaded yet, set basic display
          setCollegeSearchTerm(client.collegeCwId || client.collegeId || '');
        }
        
        // Load saved CRM Excel files if they exist and filter by type
        if (Array.isArray(client.crmExcelFiles) && client.crmExcelFiles.length > 0) {
          const crmFiles = client.crmExcelFiles.filter(file => !file.fileType || file.fileType === 'crm');
          const brandingFiles = client.crmExcelFiles.filter(file => file.fileType === 'branding');
          setSavedCrmExcelFiles(crmFiles);
          setSavedBrandingFiles(brandingFiles);
        }

        // Set the active section to basic for viewing/editing
        setActiveSection('basic');
        
        // Hide pending clients section when editing a specific client
        setShowPendingClients(false);
      } else {
        alert('Failed to load client data: ' + (result.message || 'Client not found'));
        // Redirect back to create page without edit param
        router.replace('/clients/create');
      }
    } catch (error) {
      console.error('Error loading client for edit:', error);
      alert('Failed to load client data. Please try again.');
      router.replace('/clients/create');
    } finally {
      setEditClientLoading(false);
    }
  }, [router, colleges]);

  // Effect to load client when editClientId changes and required data is loaded
  useEffect(() => {
    if (editClientId && reportingUsers.length > 0 && colleges.length > 0) {
      loadClientForEdit(editClientId);
    }
  }, [editClientId, reportingUsers.length, colleges.length, loadClientForEdit]);

  // Effect to update college search term when colleges are loaded and we're in edit mode
  useEffect(() => {
    if (formData.collegeId && colleges.length > 0 && !collegeSearchTerm) {
      const matchedCollege = colleges.find(c => 
        String(c.collegeId) === String(formData.collegeId) || 
        String(c.cwId) === String(formData.collegeCwId)
      );
      if (matchedCollege) {
        const cwId = matchedCollege.cwId || matchedCollege.collegeId;
        const displayText = `(ID: ${cwId}) ${matchedCollege.name}`;
        setCollegeSearchTerm(displayText);
      } else if (formData.collegeCwId || formData.collegeId) {
        setCollegeSearchTerm(formData.collegeCwId || formData.collegeId || '');
      }
    }
  }, [formData.collegeId, formData.collegeCwId, colleges, collegeSearchTerm]);

  useEffect(() => {
    const normalizedCollegeId = formData.collegeId ? String(formData.collegeId).trim() : '';

    if (!normalizedCollegeId) {
      setCoursesLoading(false);
      setCoursesError('');
      setCoursesNotice('');
      setCourseOptions([]);
      return;
    }

    let isActive = true;
    const requestId = courseRequestIdRef.current + 1;
    courseRequestIdRef.current = requestId;

    const loadCoursesForCollege = async () => {
      setCoursesLoading(true);
      setCoursesError('');
      setCoursesNotice('');

      try {
        const result = await fetchCoursesByProgrammes(normalizedCollegeId);
        if (!isActive || courseRequestIdRef.current !== requestId) {
          return;
        }

        // console.log("programmes" , result)

        if (result.success) {
          const courses = Array.isArray(result.data) ? result.data : [];
          setCourseOptions(courses);

          const normalizedNames = new Set();
          courses.forEach((course) => {
            const name = course?.name ? String(course.name).trim().toLowerCase() : '';
            if (name) {
              normalizedNames.add(name);
              catalogCourseNamesRef.current.add(name);
            }
          });

          let removedCount = 0;
          setFormData((prev) => {
            const existing = Array.isArray(prev.courses) ? prev.courses : [];
            if (!existing.length) {
              return prev;
            }

            const filtered = existing.filter((courseName) => {
              const normalized = courseName?.toString().trim().toLowerCase();
              if (!normalized) {
                return false;
              }

              if (!catalogCourseNamesRef.current.has(normalized)) {
                return true;
              }

              return normalizedNames.has(normalized);
            });

            if (filtered.length === existing.length) {
              return prev;
            }

            removedCount = existing.length - filtered.length;
            return {
              ...prev,
              courses: filtered
            };
          });

          if (removedCount > 0) {
            setCoursesNotice(
              `Removed ${removedCount} course${removedCount === 1 ? '' : 's'} not linked to this college.`
            );
          } else if (!courses.length) {
            setCoursesNotice('No catalogued courses found for this college. You can add courses manually.');
          } else {
            setCoursesNotice('');
          }
        } else {
          setCourseOptions([]);
          setCoursesError(result.message || 'Failed to fetch college courses');
        }
      } catch (error) {
        if (!isActive || courseRequestIdRef.current !== requestId) {
          return;
        }
        console.error('CreateClient | fetch college courses error:', error);
        setCourseOptions([]);
        setCoursesError(error?.message || 'Failed to fetch college courses');
      } finally {
        if (isActive && courseRequestIdRef.current === requestId) {
          setCoursesLoading(false);
        }
      }
    };

    loadCoursesForCollege();

    return () => {
      isActive = false;
    };
  }, [formData.collegeId]);

  useEffect(() => {
    if (!formData.state) {
      if (selectedStateId) {
        setSelectedStateId('');
      }
      return;
    }

    const matchedState = locationOptions.states.find(
      (state) => state.name?.toLowerCase() === formData.state.toLowerCase()
    );
    const matchedStateId = matchedState ? String(matchedState.id) : '';
    if (matchedStateId !== selectedStateId) {
      setSelectedStateId(matchedStateId);
    }
  }, [formData.state, locationOptions.states, selectedStateId]);


    useEffect(() => {
    loadColleges();
  }, [loadColleges]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);
  
  useEffect(() => {
    loadPendingClients();
  }, [loadPendingClients]);

  useEffect(() => {
    const loadTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const result = await getExportTemplates();
        if (result.success) {
          setExportTemplates(result.data || []);
        }
      } catch (error) {
        console.error('Failed to load export templates:', error);
      } finally {
        setTemplatesLoading(false);
      }
    };
    loadTemplates();
  }, []);


  // Load cities when state is selected (for edit mode or state changes)
  useEffect(() => {
    if (selectedStateId && locationOptions.states.length > 0) {
      loadCitiesByState(selectedStateId);
    }
  }, [selectedStateId, loadCitiesByState, locationOptions.states.length]);

  useEffect(() => {
    if (!formData.city) {
      if (selectedCityId) {
        setSelectedCityId('');
      }
      return;
    }

    const comparisonList = selectedStateId ? filteredCities : locationOptions.cities;
    const matchedCity = comparisonList.find(
      (city) => city.name?.toLowerCase() === formData.city.toLowerCase()
    );
    const matchedCityId = matchedCity ? String(matchedCity.id) : '';

    if (matchedCityId !== selectedCityId) {
      setSelectedCityId(matchedCityId);
    }
  }, [formData.city, selectedStateId, filteredCities, locationOptions.cities, selectedCityId]);

  // Calculate months between active and inactive dates
  useEffect(() => {
    const endDate = formData.expiryDate || formData.inactiveDate;
    if (formData.activeDate && endDate) {
      const months = getMonthsBetweenDates(formData.activeDate, endDate);
      setMonthsArray(months);
      
      // Clean up monthlyLimits for months that no longer exist
      setFormData(prev => {
        const newMonthlyLimits = { ...(prev.monthlyLimits || {}) };
        const validKeys = new Set(months.map(m => m.key));
        
        Object.keys(newMonthlyLimits).forEach(key => {
          if (!validKeys.has(key)) {
            delete newMonthlyLimits[key];
          }
        });
        
        return {
          ...prev,
          monthlyLimits: newMonthlyLimits
        };
      });
    } else {
      setMonthsArray([]);
      setFormData(prev => ({
        ...prev,
        monthlyLimits: {}
      }));
    }
  }, [formData.activeDate, formData.expiryDate, formData.inactiveDate]);

  // Calculate push limits whenever limits change (with debouncing)
  useEffect(() => {
    // Debounce timer to prevent API calls on every keystroke
    const debounceTimer = setTimeout(async () => {
      const result = await calculatePushLimits(
        formData.pushLeadsLimit ? parseInt(formData.pushLeadsLimit) : null,
        formData.dailyPushLimit ? parseInt(formData.dailyPushLimit) : null,
        coursePushLimits
      );
      
      if (result.success && result.data) {
        setLimitCalculation(result.data);
      }
    }, 500); // Wait 500ms after user stops typing

    // Cleanup function to cancel pending API calls
    return () => clearTimeout(debounceTimer);
  }, [coursePushLimits, formData.pushLeadsLimit, formData.dailyPushLimit]);


const toAcademicYear = (year) => {
  if (!year) return null;
  if (String(year).includes('-')) return String(year); // already "2025-26"
  const y = parseInt(year);
  if (isNaN(y)) return null;
  return `${y - 1}-${String(y).slice(-2)}`; // "2026" → "2025-26"
};

const handleInputChange = useCallback((e) => {
  const { name, value } = e.target;

  // console.log("campaign name", name, value);

  setFormData(prev => {
    let updated = {
      ...prev,
      [name]: value
    };

     if (name === 'year') {
      // Normalize: if someone pastes "2025-26", convert back to "2026"
      let plainYear = value;
      if (String(value).includes('-')) {
        // "2025-26" → extract start year + 1 = 2026
        const startYear = parseInt(String(value).split('-')[0]);
        if (!isNaN(startYear)) {
          plainYear = String(startYear + 1);
        }
      }
      updated = { ...updated, year: plainYear };
    }



    // Sync Campaign Details → Competitor Table
    if (
      name === "targetApplicationDelivered" ||
      name === "targetAdmissionDelivered"
    ) {
      const today = new Date();
      const currentMonth = today.toLocaleString("en-US", { month: "long" });
      // const currentYear = prev.year || today.getFullYear().toString();

      const existingPerformance = prev.competitorPerformance || {};
      const plainYearSync = prev.year && !String(prev.year).includes('-')
        ? prev.year : today.getFullYear().toString()
      const academicYear = toAcademicYear(plainYearSync)
      // const academicYear = toAcademicYear(prev.year) || toAcademicYear(today.getFullYear().toString());

      const yearData = existingPerformance[academicYear] || {};  // ✅ use academicYear key
      const monthData = yearData[currentMonth] || { 
        mainCollege: {
          applicationsDelivered: "",
          admissionsDelivered: "",
          applicationsRejected: ""
        },
        competitors: {}
      };

      updated = {
        ...updated,
        competitorPerformance: {
          ...existingPerformance,
          [academicYear]: {
            ...yearData,
            [currentMonth]: {
              ...monthData,
              mainCollege: {
                ...monthData.mainCollege,
                applicationsDelivered:
                  name === "targetApplicationDelivered"
                    ? Number(value)
                    : monthData.mainCollege.applicationsDelivered,

                admissionsDelivered:
                  name === "targetAdmissionDelivered"
                    ? Number(value)
                    : monthData.mainCollege.admissionsDelivered
              }
            }
          }
        }
      };
    }

    return updated;
  });

  // EXISTING LOGIC
  if (name === 'state') {
    if (selectedStateId) setSelectedStateId('');
    if (selectedCityId) setSelectedCityId('');
  }

  if (name === 'city' && selectedCityId) {
    setSelectedCityId('');
  }

  setErrors(prev => {
    if (prev[name]) {
      return { ...prev, [name]: '' };
    }
    return prev;
  });

}, [selectedStateId, selectedCityId]);

  // const handleInputChange = useCallback((e) => {
  //   const { name, value } = e.target;

  //   console.log("campaign name" , name , value)
    
  //   setFormData(prev => ({
  //     ...prev,
  //     [name]: value
  //   }));
  //   if (name === 'state') {
  //     if (selectedStateId) {
  //       setSelectedStateId('');
  //     }
  //     if (selectedCityId) {
  //       setSelectedCityId('');
  //     }
  //   }
  //   if (name === 'city' && selectedCityId) {
  //     setSelectedCityId('');
  //   }
  //   // Clear error for this field
  //   setErrors(prev => {
  //     if (prev[name]) {
  //       return {
  //         ...prev,
  //         [name]: ''
  //       };
  //     }
  //     return prev;
  //   });
  // }, [selectedStateId, selectedCityId]);

  const handleMonthlyLimitChange = useCallback((monthKey, value) => {
    const numValue = value === '' ? '' : parseInt(value) || 0;
    
    setFormData(prev => {
      const newMonthlyLimits = {
        ...(prev.monthlyLimits || {}),
        [monthKey]: numValue
      };
      
      // Calculate total of all monthly limits
      const totalMonthlyLimits = Object.values(newMonthlyLimits).reduce((sum, limit) => {
        return sum + (typeof limit === 'number' ? limit : 0);
      }, 0);
      
      // Check if total exceeds pushLeadsLimit
      const pushLeadsLimit = parseInt(prev.pushLeadsLimit) || 0;
      if (pushLeadsLimit > 0 && totalMonthlyLimits > pushLeadsLimit) {
        // Show error or prevent update
        alert(`Total monthly limits (${totalMonthlyLimits}) cannot exceed Total Push Leads Limit (${pushLeadsLimit})`);
        return prev;
      }
      
      return {
        ...prev,
        monthlyLimits: newMonthlyLimits
      };
    });
  }, []);

  const handleOpenDailyDeliveryModal = useCallback((channel) => {
    setCurrentDeliveryChannel(channel);
    setDailyDeliveryDate('');
    setDailyDeliveryAmount('');
    setDailyDeliveryOpens('');
    setDailyDeliveryLeadsDelivered('');
    setShowDailyDeliveryModal(true);
  }, []);

  const handleCloseDailyDeliveryModal = useCallback(() => {
    setShowDailyDeliveryModal(false);
    setCurrentDeliveryChannel('');
    setDailyDeliveryDate('');
    setDailyDeliveryAmount('');
    setDailyDeliveryOpens('');
    setDailyDeliveryLeadsDelivered('');
  }, []);

  const handleAddDailyDelivery = useCallback(() => {
    if (!dailyDeliveryDate || !dailyDeliveryAmount) {
      alert('Please fill in date and delivery amount');
      return;
    }

    const deliveryEntry = {
      date: dailyDeliveryDate,
      amount: parseInt(dailyDeliveryAmount) || 0,
      opens: parseInt(dailyDeliveryOpens) || 0,
      leadsDelivered: parseInt(dailyDeliveryLeadsDelivered) || 0,
      createdAt: new Date().toISOString()
    };

    setFormData(prev => {
      const fieldName = `${currentDeliveryChannel}DailyDeliveries`;
      const existingDeliveries = prev[fieldName] || [];
      
      // Check if date already exists
      const dateExists = existingDeliveries.some(d => d.date === dailyDeliveryDate);
      if (dateExists) {
        alert('A delivery record for this date already exists');
        return prev;
      }

      const updatedDeliveries = [...existingDeliveries, deliveryEntry].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );

      // Auto-calculate totals
      const totalDelivered = updatedDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
      const totalOpens = updatedDeliveries.reduce((sum, d) => sum + (d.opens || 0), 0);
      const totalLeadsDelivered = updatedDeliveries.reduce((sum, d) => sum + (d.leadsDelivered || 0), 0);
      
      // Calculate Open Rate % and CR %
      const openRate = totalLeadsDelivered > 0 ? ((totalOpens / totalLeadsDelivered) * 100).toFixed(2) : 0;
      const conversionRate = totalLeadsDelivered > 0 ? ((totalDelivered / totalLeadsDelivered) * 100).toFixed(2) : 0;
      
      const deliveryFieldName = `${currentDeliveryChannel}Delivery`;
      const openRateFieldName = `${currentDeliveryChannel}OpenRate`;
      const crFieldName = `${currentDeliveryChannel}CR`;

      return {
        ...prev,
        [fieldName]: updatedDeliveries,
        [deliveryFieldName]: totalDelivered,
        [openRateFieldName]: parseFloat(openRate),
        [crFieldName]: parseFloat(conversionRate)
      };
    });

    handleCloseDailyDeliveryModal();
  }, [dailyDeliveryDate, dailyDeliveryAmount, dailyDeliveryOpens, dailyDeliveryLeadsDelivered, currentDeliveryChannel, handleCloseDailyDeliveryModal]);

  const handleRemoveDailyDelivery = useCallback((channel, date) => {
    setFormData(prev => {
      const fieldName = `${channel}DailyDeliveries`;
      const existingDeliveries = prev[fieldName] || [];
      
      const updatedDeliveries = existingDeliveries.filter(d => d.date !== date);
      
      // Auto-calculate totals after removal
      const totalDelivered = updatedDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
      const totalOpens = updatedDeliveries.reduce((sum, d) => sum + (d.opens || 0), 0);
      const totalLeadsDelivered = updatedDeliveries.reduce((sum, d) => sum + (d.leadsDelivered || 0), 0);
      
      // Recalculate Open Rate % and CR %
      const openRate = totalLeadsDelivered > 0 ? ((totalOpens / totalLeadsDelivered) * 100).toFixed(2) : 0;
      const conversionRate = totalLeadsDelivered > 0 ? ((totalDelivered / totalLeadsDelivered) * 100).toFixed(2) : 0;
      
      const deliveryFieldName = `${channel}Delivery`;
      const openRateFieldName = `${channel}OpenRate`;
      const crFieldName = `${channel}CR`;

      return {
        ...prev,
        [fieldName]: updatedDeliveries,
        [deliveryFieldName]: totalDelivered,
        [openRateFieldName]: parseFloat(openRate),
        [crFieldName]: parseFloat(conversionRate)
      };
    });
  }, []);

  const handleCourseToggle = (courseName = '') => {
    const trimmedCourse = courseName.trim();
    if (!trimmedCourse) {
      return;
    }

    setFormData((prev) => {
      const existingCourses = Array.isArray(prev.courses) ? prev.courses : [];
      const hasCourse = existingCourses.some(
        (course) => course?.toString().trim().toLowerCase() === trimmedCourse.toLowerCase()
      );
      const updatedCourses = hasCourse
        ? existingCourses.filter(
            (course) => course?.toString().trim().toLowerCase() !== trimmedCourse.toLowerCase()
          )
        : [...existingCourses, trimmedCourse];
      return {
        ...prev,
        courses: updatedCourses
      };
    });

    if (errors.courses) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        courses: ''
      }));
    }
  };

  const handleCourseSearchChange = (e) => {
    setCourseSearch(e.target.value);
  };

  const handleCourseSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCourseFromSearch();
    }
    if (e.key === 'Escape') {
      setCourseSearch('');
    }
  };

  const handleAddCourseFromSearch = () => {
    const trimmedCourse = courseSearch.trim();
    if (!trimmedCourse) {
      return;
    }

    let courseAdded = false;
    setFormData((prev) => {
      const existingCourses = Array.isArray(prev.courses) ? prev.courses : [];
      const alreadySelected = existingCourses.some(
        (course) => course?.toString().trim().toLowerCase() === trimmedCourse.toLowerCase()
      );
      if (alreadySelected) {
        return prev;
      }
      courseAdded = true;
      return {
        ...prev,
        courses: [...existingCourses, trimmedCourse]
      };
    });

    if (courseAdded && errors.courses) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        courses: ''
      }));
    }

    if (courseAdded) {
      setCourseSearch('');
    }
  };

  const handleCourseLevelToggle = (levelId) => {
    const normalizedId = String(levelId);
    setSelectedCourseLevelIds((prev) => {
      const previousIds = Array.isArray(prev) ? prev : [];
      const exists = previousIds.some((id) => String(id) === normalizedId);
      if (exists) {
        return previousIds.filter((id) => String(id) !== normalizedId);
      }
      return [...previousIds, normalizedId];
    });
  };

  const handleClearCourseFilters = () => {
    setSelectedCourseLevelIds([]);
  };

  const handleCoursePushLimitChange = (courseName, value) => {
    setCoursePushLimits((prev) => {
      const updated = { ...prev };
      if (value === '' || value === null || value === undefined) {
        delete updated[courseName];
      } else {
        updated[courseName] = parseInt(value, 10) || 0;
      }
      return updated;
    });
  };

  const handleReportingUserSearchChange = (e) => {
    setReportingUserSearch(e.target.value);
  };

  const handleReportingUserSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredReportingUsers.length) {
        handleReportingUserToggle(filteredReportingUsers[0].id);
      }
    }
    if (e.key === 'Escape') {
      setReportingUserSearch('');
    }
  };

  const handleReportingUserToggle = (userId) => {
    const normalizedId = String(userId);
    setSelectedReportingUserIds((prev) => {
      const exists = prev.includes(normalizedId);
      const updated = exists
        ? prev.filter((id) => id !== normalizedId)
        : [...prev, normalizedId];

      if (errors.reportingPanel && updated.length) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          reportingPanel: ''
        }));
      }

      return updated;
    });
  };

  const handleReportingUserRemove = (userId) => {
    const normalizedId = String(userId);
    setSelectedReportingUserIds((prev) => prev.filter((id) => id !== normalizedId));
  };

  const handleClearReportingUsers = () => {
    setSelectedReportingUserIds([]);
  };
  const handleDeliveryManagerToggle = (userId) => {
    const normalizedId = String(userId);
    setSelectedDeliveryManagerIds((prev) => {
      const exists = prev.includes(normalizedId);
      const next = exists ? prev.filter((id) => id !== normalizedId) : [...prev, normalizedId];
      syncDeliveryExecutives(next);
      if (errors.deliveryExecutive && next.length) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          deliveryExecutive: ''
        }));
      }
      return next;
    });
  };

  const handleDeliveryManagerSearchChange = (e) => {
    setDeliveryManagerSearch(e.target.value);
  };

  const handleDeliveryManagerSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredDeliveryManagerOptions.length) {
        handleDeliveryManagerToggle(filteredDeliveryManagerOptions[0].id);
      }
    }
    if (e.key === 'Escape') {
      setDeliveryManagerSearch('');
    }
  };

  const handleClearDeliveryManagers = () => {
    setSelectedDeliveryManagerIds([]);
    syncDeliveryExecutives([]);
  };

  const handleFetchPushCredentials = async () => {
    if (!formData.collegeId) {
      setPushCredentialsError('Select a college first to fetch credentials');
      setPushCredentialsMessage('');
      return;
    }

    setPushCredentialsLoading(true);
    setPushCredentialsError('');
    setPushCredentialsMessage('');

    try {
      const result = await getPushCredentials(formData.collegeId);
      if (result.success && result.data) {
        const credentials = result.data || {};
        setFormData((prev) => ({
          ...prev,
          pushApiUrl: credentials.pushApiUrl || '',
          pushSecurityKey: credentials.pushSecurityKey || '',
          apiParameters: credentials.apiParameters || {},
          apiRequestType: credentials.apiRequestType || 'POST',
          apiAuthHeaderName: credentials.apiAuthHeaderName || 'AuthToken',
          apiTimeout: credentials.apiTimeout || 30000,
          apiRetryAttempts: credentials.apiRetryAttempts || 3,
          apiTestMode: credentials.apiTestMode || false
        }));

        const hasCredentials = Boolean(credentials.pushApiUrl || credentials.pushSecurityKey);
        setPushCredentialsMessage(
          hasCredentials
            ? (result.message || 'Existing credentials and API configuration applied to the form')
            : 'No credentials found for this client yet'
        );
      } else {
        setPushCredentialsError(result.message || 'Failed to fetch push credentials');
      }
    } catch (error) {
      console.error('CreateClient | fetch push credentials error:', error);
      setPushCredentialsError(error?.message || 'Failed to fetch push credentials');
    } finally {
      setPushCredentialsLoading(false);
    }
  };

  const handleCollegeChange = (e) => {
    const { value } = e.target;
    const selectedCollege = colleges.find((college) => String(college.collegeId) === value);

    // Extract both collegeId and cwId
    const collegeIdToStore = selectedCollege ? selectedCollege.collegeId : value;
    const cwIdToStore = selectedCollege?.cwId || '';
    
    setFormData((prev) => ({
      ...prev,
      collegeId: collegeIdToStore,
      collegeCwId: cwIdToStore,
      ...(selectedCollege
        ? {
            city: selectedCollege.city ?? prev.city,
            state: selectedCollege.state ?? prev.state
          }
        : {})
    }));

    if (errors.collegeId) {
      setErrors((prev) => ({
        ...prev,
        collegeId: ''
      }));
    }

    setPushCredentialsMessage('');
    setPushCredentialsError('');
  };

  const handleStateSelect = (e) => {
    const { value } = e.target;
    const previousStateId = selectedStateId;
    const selectedState = locationOptions.states.find((state) => String(state.id) === value);

    setSelectedStateId(value);
    setSelectedStateId((prevCityId) => (previousStateId !== value ? '' : prevCityId));
    setFormData((prev) => ({
      ...prev,
      state: selectedState?.name || '',
      city: previousStateId !== value ? '' : prev.city
    }));

    // Load cities for the selected state
    if (value) {
      loadCitiesByState(value);
    }

    if (errors.state) {
      setErrors((prev) => ({
        ...prev,
        state: ''
      }));
    }
    if (errors.city && previousStateId !== value) {
      setErrors((prev) => ({
        ...prev,
        city: ''
      }));
    }
  };

  const handleCitySelect = (e) => {
    const { value } = e.target;
    const selectedCity = locationOptions.cities.find((city) => String(city.id) === value);

    setSelectedCityId(value);
    setFormData((prev) => ({
      ...prev,
      city: selectedCity?.name || ''
    }));

    if (errors.city) {
      setErrors((prev) => ({
        ...prev,
        city: ''
      }));
    }
  };

  const handleTopStateSelect = (stateName = '') => {
    const trimmedName = stateName.trim();
    if (!trimmedName) {
      return;
    }

    const matchedState = locationOptions.states.find(
      (state) => state.name?.toLowerCase() === trimmedName.toLowerCase()
    );
    const matchedStateId = matchedState ? String(matchedState.id) : '';

    setSelectedStateId(matchedStateId);
    setSelectedCityId('');
    setFormData((prev) => ({
      ...prev,
      state: trimmedName,
      city: ''
    }));

    if (errors.state) {
      setErrors((prev) => ({
        ...prev,
        state: ''
      }));
    }
    if (errors.city) {
      setErrors((prev) => ({
        ...prev,
        city: ''
      }));
    }
  };

// College Id filled, state and city selected
const getFormatCollegeId = (Colleges) => {
  const cwId = Colleges.cwId ? ` (CW ID: ${Colleges.cwId})` : '';
  return `(ID: ${Colleges.cwId}) ${Colleges.name}}`;
}

  const handleTopCitySelect = (cityName = '', stateName = '') => {
    const trimmedCity = cityName.trim();
    if (!trimmedCity) {
      return;
    }

    const trimmedState = stateName.trim();
    let targetStateId = selectedStateId;
    let targetStateName = formData.state;

    if (trimmedState) {
      const matchedState = locationOptions.states.find(
        (state) => state.name?.toLowerCase() === trimmedState.toLowerCase()
      );
      targetStateId = matchedState ? String(matchedState.id) : '';
      targetStateName = trimmedState;
    }

    const cityMatch = locationOptions.cities.find((city) => {
      if (!city.name) {
        return false;
      }
      const sameName = city.name.toLowerCase() === trimmedCity.toLowerCase();
      if (!sameName) {
        return false;
      }
      if (targetStateId && city.stateId) {
        return String(city.stateId) === targetStateId;
      }
      return true;
    });

    setSelectedStateId(targetStateId);
    setSelectedCityId(cityMatch ? String(cityMatch.id) : '');
    setFormData((prev) => ({
      ...prev,
      state: targetStateName,
      city: trimmedCity
    }));

    if (errors.state && targetStateName) {
      setErrors((prev) => ({
        ...prev,
        state: ''
      }));
    }
    if (errors.city) {
      setErrors((prev) => ({
        ...prev,
        city: ''
      }));
    }
  };


  // Load pending client for editing
  const loadPendingClient = async (client) => {
    try {
      // Helper function to format ISO date to YYYY-MM-DD for date inputs
      const formatDateForInput = (dateValue) => {
        if (!dateValue) return '';
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
        } catch {
          return '';
        }
      };
      
      // Set form data from client
      setFormData({
        ...client,
        // Ensure string fields are never null/undefined to prevent controlled input warnings
        crmType: client.crmType || '',
        crmId: client.crmId || '',
        crmPassword: client.crmPassword || '',
        crmLink: client.crmLink || '',
        statusReason: client.statusReason || '',
        pendingReasonOther: client.pendingReasonOther || '',
        suspendReason: client.suspendReason || '',
        adCampaign: client.adCampaign || '',
        additionalEmails: Array.isArray(client.additionalEmails) ? client.additionalEmails : [],
        courses: Array.isArray(client.courses) ? client.courses : [],
        pushCourses: Array.isArray(client.pushCourses) ? client.pushCourses : [],
        topCompetitors: Array.isArray(client.topCompetitors) ? client.topCompetitors : [],
        apiFiles: Array.isArray(client.apiFiles) ? client.apiFiles : [],
        deliveryExecutive: Array.isArray(client.deliveryExecutive) ? '' : (client.deliveryExecutive || ''),
        salesHeadApproval: Boolean(client.salesHeadApproval),
        completionStage: client.completionStage || 0,
        // Parse daily deliveries JSON strings
        emailDailyDeliveries: (() => {
          if (Array.isArray(client.emailDailyDeliveries)) return client.emailDailyDeliveries;
          if (typeof client.emailDailyDeliveries === 'string') {
            try { return JSON.parse(client.emailDailyDeliveries) || []; } catch { return []; }
          }
          return [];
        })(),
        messageDailyDeliveries: (() => {
          if (Array.isArray(client.messageDailyDeliveries)) return client.messageDailyDeliveries;
          if (typeof client.messageDailyDeliveries === 'string') {
            try { return JSON.parse(client.messageDailyDeliveries) || []; } catch { return []; }
          }
          return [];
        })(),
        whatsappDailyDeliveries: (() => {
          if (Array.isArray(client.whatsappDailyDeliveries)) return client.whatsappDailyDeliveries;
          if (typeof client.whatsappDailyDeliveries === 'string') {
            try { return JSON.parse(client.whatsappDailyDeliveries) || []; } catch { return []; }
          }
          return [];
        })(),
        // Format dates for HTML date inputs (YYYY-MM-DD format)
        expiryDate: formatDateForInput(client.expiryDate),
        activeDate: formatDateForInput(client.activeDate),
        inactiveDate: formatDateForInput(client.inactiveDate),
        googleAdsStartDate: formatDateForInput(client.googleAdsStartDate),
        googleAdsEndDate: formatDateForInput(client.googleAdsEndDate),
        metaAdsStartDate: formatDateForInput(client.metaAdsStartDate),
        metaAdsEndDate: formatDateForInput(client.metaAdsEndDate),
        bingAdsStartDate: formatDateForInput(client.bingAdsStartDate),
        bingAdsEndDate: formatDateForInput(client.bingAdsEndDate),
      });
      
      // Set college search term display if college is selected
      if (client.collegeId && colleges.length > 0) {
        const matchedCollege = colleges.find(c => 
          String(c.collegeId) === String(client.collegeId) || 
          String(c.cwId) === String(client.collegeCwId)
        );
        if (matchedCollege) {
          const cwId = matchedCollege.cwId || matchedCollege.collegeId;
          const displayText = `(ID: ${cwId}) ${matchedCollege.name}`;
          setCollegeSearchTerm(displayText);
        } else {
          setCollegeSearchTerm(client.collegeCwId || client.collegeId || '');
        }
      }

      // Set related state
      const savedReportingPanel = Array.isArray(client.reportingPanel) ? client.reportingPanel : [];
      
      // If no reporting panel was saved, auto-select upper roles and current user
      if (savedReportingPanel.length === 0 && reportingUsers.length > 0) {
        const currentUser = getCurrentUser();
        const currentUserId = currentUser?.id || currentUser?._id || currentUser?.userId;
        const autoSelectRoles = [
          'admin', 'super-admin',
          'ops-head', 'operations-head', 'ops head', 'operations head', 'opshead',
          'sales-head', 'sales head', 'saleshead',
          'api-integrator', 'api integrator', 'apiintegrator', 'api-integration',
          'operations-team', 'sales-team'
        ];
        
        const usersToAutoSelect = reportingUsers.filter(user => {
          const normalizedRole = (user.role || '').toLowerCase().replace(/[_\s]+/g, '-');
          const canonicalRole = (user.canonicalRole || '').toLowerCase();
          
          const isUpperRole = autoSelectRoles.some(role => {
            const normalizedAutoRole = role.replace(/[\s]+/g, '-');
            return normalizedRole.includes(normalizedAutoRole) || 
                   canonicalRole.includes(normalizedAutoRole) ||
                   normalizedRole === normalizedAutoRole ||
                   canonicalRole === normalizedAutoRole;
          });
          
          const isCurrentUser = currentUserId && (
            user.id === String(currentUserId) || 
            user.raw?.id === currentUserId ||
            user.raw?._id === currentUserId ||
            user.raw?.userId === currentUserId
          );
          
          return isUpperRole || isCurrentUser;
        });
        
        const autoSelectedIds = usersToAutoSelect.map(user => user.id);
        setSelectedReportingUserIds(autoSelectedIds.length > 0 ? autoSelectedIds : []);
      } else {
        setSelectedReportingUserIds(savedReportingPanel);
      }
      
      setSelectedDeliveryManagerIds(Array.isArray(client.deliveryExecutive) ? client.deliveryExecutive : []);
      setSelectedTopCities(Array.isArray(client.topCity) ? client.topCity : []);
      setSelectedTopStates(Array.isArray(client.topState) ? client.topState : []);
      setCoursePushLimits(client.coursePushLimit || {});
      setCourseMappings(client.courseMappings || {});
      
      // Load saved CRM Excel files if they exist and filter by type
      if (Array.isArray(client.crmExcelFiles) && client.crmExcelFiles.length > 0) {
        const crmFiles = client.crmExcelFiles.filter(file => !file.fileType || file.fileType === 'crm');
        const brandingFiles = client.crmExcelFiles.filter(file => file.fileType === 'branding');
        setSavedCrmExcelFiles(crmFiles);
        setSavedBrandingFiles(brandingFiles);
      }

      // Navigate to the next incomplete step
      const nextStep = (client.completionStage || 0) + 1;
      if (nextStep <= 1) setActiveSection('basic');
      else if (nextStep === 2) setActiveSection('config');
      else if (nextStep === 3) setActiveSection('approval');
      else if (nextStep === 4) setActiveSection('api');
      else setActiveSection('basic');

      // Hide pending clients and scroll to top
      setShowPendingClients(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error loading pending client:', error);
      alert('Failed to load client data. Please try again.');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (!formData.collegeId.trim()) {
      newErrors.collegeId = 'College ID is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Invalid phone number (10 digits required)';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate only step 1 (basic details)
  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (!formData.collegeId.trim()) {
      newErrors.collegeId = 'College ID is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Invalid phone number (10 digits required)';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigate to next section with validation
  const handleNextSection = () => {
    const sections = ['basic', 'config', 'approval', 'api'];
    const currentIndex = sections.indexOf(activeSection);
    
    // Validate step 1 before moving to other sections
    if (currentIndex === 0 && !validateStep1()) {
      alert('Please complete all required fields in the Basic Information section before proceeding.');
      return;
    }
    
    if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1]);
      setCurrentStep(currentIndex + 1);
    }
  };

  // Navigate to previous section
  const handlePreviousSection = () => {
    const sections = ['basic', 'config', 'approval', 'api'];
    const currentIndex = sections.indexOf(activeSection);
    if (currentIndex > 0) {
      setActiveSection(sections[currentIndex - 1]);
      setCurrentStep(currentIndex - 1);
    }
  };

  const handleExcelUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setExcelUploadError('');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        if (jsonData.length < 2) {
          setExcelUploadError('Excel file must contain headers and at least one row of data');
          return;
        }

        // Parse Excel data
        const headers = jsonData[0];
        const rows = jsonData.slice(1);
        
        // Map Excel columns to form fields (case-insensitive)
        const parseRow = (row) => {
          const rowData = {};
          headers.forEach((header, index) => {
            const headerLower = String(header).toLowerCase().trim();
            const value = row[index];
            
            // Map common field names
            if (headerLower.includes('client') && headerLower.includes('name')) rowData.clientName = value;
            else if (headerLower.includes('college') && headerLower.includes('id')) rowData.collegeId = value;
            else if (headerLower === 'email') rowData.email = value;
            else if (headerLower.includes('phone')) rowData.phone = value;
            else if (headerLower === 'city') rowData.city = value;
            else if (headerLower === 'state') rowData.state = value;
            else if (headerLower === 'address') rowData.address = value;
            else if (headerLower === 'pincode' || headerLower === 'pin code') rowData.pincode = value;
            else if (headerLower.includes('institution') && headerLower.includes('type')) rowData.institutionType = value;
            else if (headerLower.includes('crm') && headerLower.includes('type')) rowData.crmType = value;
            else if (headerLower.includes('crm') && headerLower.includes('id')) rowData.crmId = value;
            else if (headerLower.includes('crm') && headerLower.includes('password')) rowData.crmPassword = value;
            else if (headerLower.includes('crm') && headerLower.includes('link')) rowData.crmLink = value;
            else if (headerLower.includes('api') && headerLower.includes('url')) rowData.pushApiUrl = value;
            else if (headerLower.includes('security') && headerLower.includes('key')) rowData.pushSecurityKey = value;
            else if (headerLower.includes('course') && !headerLower.includes('limit')) {
              // Parse courses as comma-separated
              rowData.courses = value ? String(value).split(',').map(c => c.trim()).filter(Boolean) : [];
            }
            else if (headerLower.includes('push') && headerLower.includes('limit')) rowData.pushLeadsLimit = value;
            else if (headerLower.includes('daily') && headerLower.includes('limit')) rowData.dailyPushLimit = value;
          });
          return rowData;
        };

        const parsedData = rows.map(parseRow).filter(row => row.clientName || row.collegeId);
        
        if (parsedData.length === 0) {
          setExcelUploadError('No valid client data found in Excel file');
          return;
        }

        setExcelData(parsedData);
        setShowExcelPreview(true);
        
      } catch (error) {
        console.error('Excel parsing error:', error);
        setExcelUploadError('Failed to parse Excel file: ' + error.message);
      }
    };
    
    reader.onerror = () => {
      setExcelUploadError('Failed to read Excel file');
    };
    
    reader.readAsArrayBuffer(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyExcelData = (rowIndex) => {
    if (!excelData || !excelData[rowIndex]) return;
    
    const data = excelData[rowIndex];
    setFormData(prev => ({
      ...prev,
      ...data
    }));
    
    setShowExcelPreview(false);
    setExcelData(null);
  };

  const handleCloseExcelPreview = () => {
    setShowExcelPreview(false);
    setExcelData(null);
    setExcelUploadError('');
  };

  const parseExcelFileForPreview = async (file) => {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames?.[0];
    if (!sheetName) {
      throw new Error('No sheet found in Excel file');
    }

    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!Array.isArray(matrix) || matrix.length < 1) {
      throw new Error('Excel sheet is empty');
    }

    const rawHeaders = Array.isArray(matrix[0]) ? matrix[0] : [];
    const headers = rawHeaders
      .map((h) => String(h ?? '').trim())
      .filter((h) => Boolean(h));

    const dataRows = matrix.slice(1);
    const totalRows = dataRows.length;

    const rowsPreview = dataRows
      .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim()))
      .slice(0, 5)
      .map((row) => {
        const obj = {};
        headers.forEach((key, idx) => {
          obj[key] = row?.[idx];
        });
        return obj;
      });

    return {
      id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}`,
      fileName: file.name,
      file: file, // Store the file object for backend upload
      sheetName,
      headers,
      rowsPreview,
      totalRows,
      uploadedAt: new Date().toISOString(),
      uploadSource: 'sales' // Will be set by the upload handler
    };
  };

  const handleApiExcelUpload = async (event, source = 'sales') => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    setApiExcelUploadError('');

    try {
      const parsed = [];
      for (const file of files) {
        // Basic guard
        const lower = String(file.name || '').toLowerCase();
        if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.pdf') && !lower.endsWith('.csv') && !lower.endsWith('.docx') && !lower.endsWith('.doc') && !lower.endsWith('.txt') && !lower.endsWith('.ppt') && !lower.endsWith('.pptx') && !lower.endsWith('.xlsm') && !lower.endsWith('.xlsb') && !lower.endsWith('.odt') && !lower.endsWith('.ods') && !lower.endsWith('.rtf')) {
          continue;
        }
        const item = await parseExcelFileForPreview(file);
        item.uploadSource = source; // Set the upload source
        parsed.push(item);
      }

      if (!parsed.length) {
        setApiExcelUploadError('No valid files selected (.xlsx / .xls / .pdf / .csv / .doc / .docx / .txt / .ppt / .pptx / .xlsm / .xlsb / .odt / .ods / .rtf)');
        return;
      }

      setCrmExcelFilesToUpload((prev) => {
        const existingIds = new Set((prev || []).map((x) => x.id));
        const next = [...(prev || [])];
        parsed.forEach((item) => {
          if (!existingIds.has(item.id)) {
            next.push(item);
          }
        });
        return next;
      });
    } catch (error) {
      console.error('API Excel parsing error:', error);
      setApiExcelUploadError(error?.message || 'Failed to parse Excel file');
    } finally {
      // Reset input so re-uploading same file works
      if (apiExcelInputRef.current) {
        apiExcelInputRef.current.value = '';
      }
    }
  };

  const handleRemovePendingFile = (id) => {
    setCrmExcelFilesToUpload((prev) => (prev || []).filter((item) => item.id !== id));
  };

  const handleDeleteSavedFile = async (fileId) => {
    if (!formData.id) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this file?');
    if (!confirmed) return;

    const { success, message } = await deleteCrmExcelFile(formData.id, fileId);
    if (success) {
      setSavedCrmExcelFiles((prev) => prev.filter((f) => f.id !== fileId));
    } else {
      setApiExcelUploadError(message || 'Failed to delete file');
    }
  };

  const handleClearPendingFiles = () => {
    setCrmExcelFilesToUpload([]);
    setApiExcelUploadError('');
    if (apiExcelInputRef.current) {
      apiExcelInputRef.current.value = '';
    }
  };

  const uploadCrmExcelFilesToBackend = async (clientId) => {
    if (!crmExcelFilesToUpload.length) return { success: true };

    // Group files by uploadSource
    const salesFiles = [];
    const operationsFiles = [];
    
    crmExcelFilesToUpload.forEach(item => {
      if (item.file instanceof File) {
        if (item.uploadSource === 'operations') {
          operationsFiles.push(item.file);
        } else {
          // Default to sales if not specified
          salesFiles.push(item.file);
        }
      }
    });
    
    const allUploadedFiles = [];
    
    // Upload sales team files
    if (salesFiles.length > 0) {
      console.log('Uploading Sales Team CRM files:', {
        clientId,
        fileCount: salesFiles.length,
        files: salesFiles.map(f => ({ name: f?.name, size: f?.size }))
      });

      const salesResult = await uploadCrmExcelFiles(clientId, salesFiles, 'crm', 'sales');
      
      if (salesResult.success) {
        allUploadedFiles.push(...(salesResult.data || []));
      } else {
        return salesResult; // Return error if sales upload fails
      }
    }
    
    // Upload operations team files
    if (operationsFiles.length > 0) {
      console.log('Uploading Operations Team CRM files:', {
        clientId,
        fileCount: operationsFiles.length,
        files: operationsFiles.map(f => ({ name: f?.name, size: f?.size }))
      });

      const opsResult = await uploadCrmExcelFiles(clientId, operationsFiles, 'crm', 'operations');
      
      if (opsResult.success) {
        allUploadedFiles.push(...(opsResult.data || []));
      } else {
        return opsResult; // Return error if operations upload fails
      }
    }
    
    // Update state with all uploaded files
    if (allUploadedFiles.length > 0) {
      setSavedCrmExcelFiles((prev) => [...prev, ...allUploadedFiles]);
      setCrmExcelFilesToUpload([]);
    }
    
    return { 
      success: true, 
      data: allUploadedFiles,
      message: `${allUploadedFiles.length} file(s) uploaded successfully`
    };
  };

  // Branding File Upload Handlers
  const handleBrandingFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    setBrandingUploadError('');

    try {
      const parsed = [];
      for (const file of files) {
        const item = await parseExcelFileForPreview(file);
        parsed.push(item);
      }

      if (!parsed.length) {
        setBrandingUploadError('No valid files selected');
        return;
      }

      setBrandingFilesToUpload((prev) => {
        const existingIds = new Set((prev || []).map((x) => x.id));
        const next = [...(prev || [])];
        parsed.forEach((item) => {
          if (!existingIds.has(item.id)) {
            next.push(item);
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Branding file parsing error:', error);
      setBrandingUploadError(error?.message || 'Failed to parse file');
    } finally {
      if (brandingFileInputRef.current) {
        brandingFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveBrandingFile = (id) => {
    setBrandingFilesToUpload((prev) => (prev || []).filter((item) => item.id !== id));
  };

  const handleDeleteSavedBrandingFile = async (fileId) => {
    if (!formData.id) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this file?');
    if (!confirmed) return;

    const { success, message } = await deleteCrmExcelFile(formData.id, fileId);
    if (success) {
      setSavedBrandingFiles((prev) => prev.filter((f) => f.id !== fileId));
    } else {
      setBrandingUploadError(message || 'Failed to delete file');
    }
  };

  const handleDownloadBrandingFile = async (fileId, fileName) => {
    if (!formData.id) return;
    
    try {
      const response = await fetch(`/api/clients/${formData.id}/crm-excel/${fileId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };


  const uploadBrandingFilesToBackend = async (clientId) => {
    if (!brandingFilesToUpload.length) return { success: true };

    const filesToUpload = brandingFilesToUpload
      .map(item => item.file)
      .filter(f => f instanceof File);
    
    if (!filesToUpload.length) {
      return { success: true };
    }

    const result = await uploadCrmExcelFiles(clientId, filesToUpload, 'branding');
    
    if (result.success) {
      setSavedBrandingFiles((prev) => [...prev, ...(result.data || [])]);
      setBrandingFilesToUpload([]);
    }
    
    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate at least step 1
    if (!validateStep1()) {
      alert('Please complete all required fields in the Basic Information section.');
      return;
    }

    setLoading(true);
    setErrors((prev) => ({ ...prev, submit: '' }));
    setSuccess(false);
    setSuccessMessage('');
    
    try {
      // Check if we're updating an existing client or creating a new one
      const isUpdating = formData.id != null;
      
      // Determine completion stage based on current step
      const sections = ['basic', 'config', 'approval', 'api'];
      const currentIndex = sections.indexOf(activeSection);
      const completionStage = currentIndex + 1;

      // Prepare payload and remove read-only fields
      const { id, createdAt, updatedAt, createdById, creator, isDeleted, lastPushCredentialsUpdated, ...cleanFormData } = formData;
      
      // For edit mode: preserve existing status, only update if user explicitly changed it
      // For create mode: set status based on completion stage
      let statusToSet;
      let pendingReasonToSet;
      
      if (isUpdating) {
        // In edit mode, check if API config was just completed
        const hasApiWebhook = formData.pushApiUrl && formData.pushApiUrl.trim() !== '';
        const hasApiKey = formData.pushSecurityKey && formData.pushSecurityKey.trim() !== '';
        const apiConfigComplete = hasApiWebhook && hasApiKey;
        // Auto-activate if:
        // 1. Client was Pending
        // 2. API config is now complete
        // 3. Completion stage is 4 or higher
        if (formData.status === 'Pending' && apiConfigComplete && completionStage >= 4) {
          console.log("inside auto-activate condition")
          statusToSet = 'Active';
          pendingReasonToSet = null;
        } else {
          // Keep existing status
          statusToSet = formData.status || 'Pending';
          pendingReasonToSet = formData.pendingReason || null;
        }
        
      } else {
        // In create mode, set status based on completion stage
        statusToSet = completionStage >= 4 ? 'Active' : 'Pending';
        pendingReasonToSet = completionStage < 4 ? (formData.pendingReason || 'Details still pending to fill') : null;
      }


      const payload = {
        ...cleanFormData,
        additionalEmails: Array.isArray(formData.additionalEmails) ? formData.additionalEmails : [],
        courses: Array.isArray(formData.courses) ? formData.courses : [],
        reportingPanel: selectedReportingUserIds, // Send array of user IDs
        deliveryExecutive: selectedDeliveryManagerIds, // Send array of user IDs
        topCity: selectedTopCities,
        topState: selectedTopStates,
        coursePushLimit: coursePushLimits,
        courseMappings: courseMappings,
        salesHeadApproval: Boolean(formData.salesHeadApproval),
        // completionStage: isUpdating ? (formData.completionStage || completionStage) : completionStage, 
        completionStage: completionStage,
        status: statusToSet,
        pendingReason: pendingReasonToSet,
        // Convert exportTemplateType to number if it's a string
        exportTemplateType: formData.exportTemplateType ? (typeof formData.exportTemplateType === 'string' ? parseInt(formData.exportTemplateType) || null : formData.exportTemplateType) : null,
        // Convert monthlyLimits object to array for backend
        monthlyLimits: formData.monthlyLimits && typeof formData.monthlyLimits === 'object' 
          ? Object.entries(formData.monthlyLimits).map(([month, limit]) => ({ month, limit }))
          : [],

      };

      
      delete payload.brandingBudget;
      delete payload.brandingBudgetDelivery;
      delete payload.brandingDuration;
      delete payload.brandingObjective;
      // delete payload.delivery;
      delete payload.emailExpectedDelivery;
      delete payload.emailDelivery;
      delete payload.messageExpectedDelivery;
      delete payload.messageDelivery;
      delete payload.whatsappExpectedDelivery;
      delete payload.whatsappDelivery;

      console.log('=== CLIENT SUBMISSION DEBUG ===');
      console.log('Is Updating:', isUpdating);
      console.log('Client ID:', formData.id);
      console.log('Completion Stage:', completionStage);
      console.log('Active Section:', activeSection);
      console.log('Payload Keys:', Object.keys(payload));
      console.log('Full Payload:', payload);
      console.log('Selected fields from payload:', {
        crmType: payload.crmType,
        crmId: payload.crmId,
        exportTemplateType: payload.exportTemplateType,
        pushApiUrl: payload.pushApiUrl,
        pushSecurityKey: payload.pushSecurityKey,
        completionStage: payload.completionStage,
        status: payload.status
      });
      
      const { success: isSuccess, message, data } = isUpdating 
        ? await updateClient(formData.id, payload)
        : await createClient(payload);

      console.log('=== API RESPONSE DEBUG ===');
      console.log('Success:', isSuccess);
      console.log('Message:', message);
      console.log('Response Data:', data);

      if (!isSuccess) {
        console.error('Client creation failed:', message);
        const errorMsg = message || 'Failed to create client. Please try again.';
        setErrors((prev) => ({ ...prev, submit: errorMsg }));
        // Scroll to top to show error
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Upload CRM Excel files after successful client creation/update
      const clientId = data?.id || formData.id;
      if (clientId && crmExcelFilesToUpload.length > 0) {
        const uploadResult = await uploadCrmExcelFilesToBackend(clientId);
        if (!uploadResult.success) {
          setApiExcelUploadError(uploadResult.message || 'Files uploaded but failed to save some files');
        }
      }

      // Upload Branding files after successful client creation/update
      if (clientId && brandingFilesToUpload.length > 0) {
        const brandingUploadResult = await uploadBrandingFilesToBackend(clientId);
        if (!brandingUploadResult.success) {
          setBrandingUploadError(brandingUploadResult.message || 'Failed to save branding files');
        }
      }

      setSuccess(true);
      const statusMsg = isUpdating 
        ? (message || 'Client updated successfully!')
        : (completionStage < 4 
            ? `Client saved! You can complete the remaining steps later.`
            : (message || 'Client created successfully!'));
      setSuccessMessage(statusMsg);
      setErrors({});

      // Reload pending clients list
      loadPendingClients();

      // Only reset form for new clients, not for edit mode
      if (!isUpdating) {
        setTimeout(() => {
          setFormData({
            clientName: '',
            collegeId: '',
            email: '',
            additionalEmails: [],
            expiryDate: '',
            phone: '',
            alternatePhone: '',
            city: '',
            state: '',
            country: 'India',
            address: '',
            pincode: '',
            institutionType: '',
            courses: [],
            status: 'Pending',
            statusReason:"",
            reportingPanel: '',
            pushApiUrl: '',
            pushSecurityKey: '',
            year: new Date().getFullYear().toString(),
            pushLeadsLimit: '',
            dailyPushLimit: '',
            completionStage: 0
          });
          setEmailInput('');
          setCollegeSearchTerm('');
          setSelectedStateId('');
          setSelectedCityId('');
          setSelectedReportingUserIds([]);
          setReportingUserSearch('');
          setSelectedDeliveryManagerIds([]);
          setDeliveryManagerSearch('');
          setPushCredentialsMessage('');
          setPushCredentialsError('');
          setSuccess(false);
          setSuccessMessage('');
          setCurrentStep(0);
          setCompletedSteps([]);
          setActiveSection('basic');
        }, 2000);
      } else {
        // For edit mode - just show success message, don't reset the form
        // User can navigate away or continue editing
        setTimeout(() => {
          setSuccess(false);
          setSuccessMessage('');
        }, 3000);
      }
      
    } catch (error) {
      console.error('Error creating client:', error);
      setErrors((prev) => ({ ...prev, submit: error.response?.data?.message || error.message || 'Failed to create client. Please try again.' }));
      setSuccess(false);
      setSuccessMessage('');
    } finally {
      setLoading(false);
    }
  };


// console.log("editClientId:", editClientId);
// console.log("formData.id:", formData.id);


  const handleReset = () => {
    setFormData({
      clientName: '',
      collegeId: '',
      email: '',
      additionalEmails: [],
      expiryDate: '',
      phone: '',
      alternatePhone: '',
      city: '',
      state: '',
      country: 'India',
      address: '',
      pincode: '',
      institutionType: '',
      courses: [],
      status: 'Pending',
      statusReason:"",
      reportingPanel: '',
      deliveryExecutive: '',
      pushApiUrl: '',
      pushSecurityKey: '',
      apiRequestType: 'POST',
      apiDataFormat: 'JSON',
      apiAuthType: 'TOKEN',
      apiAuthHeaderName: 'AuthToken',
      apiSourceValue: '',
      apiParameters: {},
      apiRequestType: 'POST',
      apiAuthHeaderName: 'AuthToken',
      apiTimeout: 30000,
      apiRetryAttempts: 3,
      apiTestMode: false,
      year: new Date().getFullYear().toString(),
      pushLeadsLimit: '',
      dailyPushLimit: ''
    });
    setEmailInput('');
    setSelectedStateId('');
    setSelectedCityId('');
    setSelectedReportingUserIds([]);
    setReportingUserSearch('');
    setSelectedDeliveryManagerIds([]);
    setDeliveryManagerSearch('');
    setPushCredentialsMessage('');
    setPushCredentialsError('');
    setCrmExcelFilesToUpload([]);
    setSavedCrmExcelFiles([]);
    setApiExcelUploadError('');
    setErrors({});
    setSuccess(false);
    setSuccessMessage('');
  };

  // Show loading state when loading client for edit
  if (editClientLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading client data...</p>
        </div>
      </div>
    );
  }

  // SHARED PROPS 
  const sharedProps = {
    formData,
    setFormData,
    errors,
    setErrors,
    reportingUsers,
    selectedReportingUserIds,
    setSelectedReportingUserIds,
    canAccess,
    canEdit,
    isEditMode,
    currentStep,
    setCurrentStep,
    handleInputChange,
    collegesLoading,
    colleges,
    collegesError,
    emailInput,
    locationLoading,
    locationOptions,
    citiesLoading,
    selectedStateId,
    selectedTopStates,
    selectedTopCities,
    apiExcelInputRef,
    handleApiExcelUpload,
    handleExcelUpload,
    apiExcelUploadError,
    crmExcelFilesToUpload,
    monthsArray,
    courseSearch,
    loadColleges,
    loadCitiesByState,
    handleCourseSearchChange,
    handleCourseSearchKeyDown,
    handleAddCourseFromSearch,
    handleCourseLevelToggle,
    hasCourseSearch,
    courseLevels,
    uncategorizedCourseCount,
    coursesError,
    coursesNotice,
    priorityCitySearchTerm,
    coursesLoading,
    groupedCourses,
    courseOptions,
    setEmailInput,
    setSelectedTopStates,
    filteredPriorityCitiesFromApi,
    setPriorityCitySearchTerm,
    brandingFileInputRef,
    handleBrandingFileUpload,
    brandingUploadError,
    brandingFilesToUpload,
    savedBrandingFiles,
    handleRemoveBrandingFile,
    handleDeleteSavedBrandingFile,
    handleDownloadBrandingFile,
    handleOpenDailyDeliveryModal,
    handleRemoveDailyDelivery,
    limitCalculation,
    coursePushLimits,
    handleCoursePushLimitChange,
    handleCourseToggle,
    setCourseSearch,
    handleMonthlyLimitChange,
    handleClearCourseFilters,
    handleCollegeChange,
    handleCitySelect,
    handleTopCitySelect,
    loadLocations,
    loadPendingClients,
    stateOptionsToRender,
    cityOptionsToRender,
    collegeSearchTerm,
    filteredCities,
    selectedCityId,
    selectedCourseLevelIds,
    selectedCourseSet,
    setCollegeSearchTerm,
    setSelectedStateId,
    setSelectedTopCities,
    setSelectedCityId,
    handleStateSelect,
    // handleEmailInputKeyPress
    // handleRemoveEmail,
    // handleAddEmail
    // CONFIGURATION
    reportingUsers,
    reportingUserSearch,
    handleDeleteSavedFile,
    handleReportingUserSearchChange,
    handleReportingUserSearchKeyDown,
    reportingUsersLoading,
    loadReportingUsers,
    selectedReportingUserIds,
    handleClearReportingUsers,
    selectedReportingUsers,
    getUserDisplayLabel,
    reportingUsersError,
    deliveryManagerSearch,
    filteredReportingUsers,
    selectedReportingUserSet,
    handleDeliveryManagerSearchChange,
    handleDeliveryManagerSearchKeyDown,
    selectedDeliveryManagerIds,
    selectedDeliveryManagerUsers,
    filteredDeliveryManagerOptions,
    selectedDeliveryManagerSet,
    savedCrmExcelFiles,
    handleReportingUserRemove,
    handleReportingUserToggle,
    deliveryManagerOptions,
    setDeliveryManagerSearch,
    handleClearDeliveryManagers,
    handleDeliveryManagerToggle,
    handleRemovePendingFile,
    setReportingUserSearch,
    // Ad Approval
    canToggleSalesHeadApproval,
    selectedGoogleAdStates,
    selectedMetaAdStates,
    selectedBingAdStates,
    // API Config
    pushCredentialsMessage,
    pushCredentialsError,
    handleFetchPushCredentials,
    pushCredentialsLoading,
    templatesLoading,
    exportTemplates
  }

  // RETURN =======================================================================
  return (
    // <ClientFormProvider value={{formData, setFormData}}>

    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-4  sm:p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className={`w-8 h-8 sm:w-12 sm:h-12 ${isEditMode ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'} rounded-2xl flex items-center justify-center shadow-lg`}>
                {isEditMode ? (
                  <PencilIcon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                ) : (
                  <UserPlusIcon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                )}
              </div>
              <div>
                <h1 className={`text-[18px] sm:text-4xl font-bold bg-clip-text text-transparent ${isEditMode ? 'bg-gradient-to-r from-amber-600 to-orange-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
                  {isEditMode ? 'Edit Client' : 'Onboard New Client'}
                </h1>
                <p className="text-gray-600 text-[10px] sm:px-0 px-1 sm:text-[16px] mt-1">
                  {isEditMode ? `Editing: ${formData.clientName || 'Client'} (${formData.collegeId || 'ID pending'})` : 'Create and configure a new client account'}
                </p>
              </div>
            </div>
            <div className="flex items-center sm:gap-3">
              {/* Back to Create New button when in edit mode */}
              {isEditMode && (
                <button
                  onClick={() => router.replace('/clients/create')}
                  className="sm:px-4 py-2 px-2 sm:text-base text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all shadow flex items-center gap-1 font-medium"
                >
                  <PlusIcon className="w-5 h-5" />
                  Create New Client
                </button>
              )}
              {/* Pending Clients Badge - Only show when not in edit mode */}
              {!isEditMode && (pendingClientsLoading || pendingClients.length > 0) && (
                <button
                  onClick={() => setShowPendingClients(!showPendingClients)}
                  disabled={pendingClientsLoading}
                  className={`relative px-2 sm:px-4 py-1 sm:py-2 text-white rounded-xl transition-all shadow-lg flex items-center sm:gap-2 ${
                    pendingClientsLoading ? 'bg-gray-400 cursor-wait' : 'bg-yellow-500 hover:bg-yellow-600'
                  }`}
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  <span className="sm:text-[12px] text-[9px] font-semibold">
                    {pendingClientsLoading ? 'Loading...' : 'Pending Clients'}
                  </span>
                  {!pendingClientsLoading && pendingClients.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {pendingClients.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Excel Upload Error
        {excelUploadError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600 font-medium">{excelUploadError}</p>
          </div>
        )} */}



        {/* Pending Clients Section */}
        {showPendingClients && (
          <div className="mb-6 bg-white rounded-2xl shadow-xl p-3 sm:p-6 border-2 border-yellow-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="sm:w-6 sm:h-6 w-8 h-8 text-yellow-600" />
                <h3 className="sm:text-xl font-bold text-gray-800">Pending Clients - Complete Setup</h3>
              </div>
              <button
                onClick={() => setShowPendingClients(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="mb-5 w-5 h-5" />
              </button>
            </div>
            {pendingClients.length > 0 ? (
              <>
                <p className="text-[12px] sm:text-sm text-gray-600 mb-4">
                  The following clients have incomplete information. Click to continue filling details.
                </p>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {pendingClients.map((client, index) => (
                    <div
                      key={client.id || `pending-client-${index}`}
                      className="flex items-center  justify-between p-2 sm:p-4 bg-yellow-50 rounded-xl border border-yellow-200 hover:bg-yellow-100 transition-all"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{client.clientName}</h4>
                        <p className="sm:text-sm text-[9px] font-bold sm:font-semibold text-gray-600">{client.email}</p>
                        <div className="mt-1 flex items-start space-x-1 ">
                          <span className="text-[8px] sm:text-xs bg-yellow-200  text-yellow-800 px-1 py-1 rounded">
                            Step {client.completionStage || 1} of 4 completed
                          </span>
                          {client.pendingReason && (
                            <span className="text-[8px] sm:text-xs text-gray-500">• {client.pendingReason}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => loadPendingClient(client)}
                        className=" px-2 py-1 sm:px-4 sm:py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all text-[10px] sm:text-sm font-medium"
                      >
                        Continue Setup
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No pending clients found</p>
                <p className="text-sm text-gray-500 mt-1">All clients have completed their setup or no clients exist yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section Navigation Tabs */}
          <div className="bg-white rounded-3xl text-center shadow-xl border-2 border-blue-100 overflow-hidden">
            <div className="grid grid-cols-4 divide-x  divide-gray-200">
              <button
                type="button"
                onClick={() => setActiveSection('basic')}
                className={`px-4 py-4 text-center font-semibold transition-all relative ${
                  activeSection === 'basic'
                    ? 'bg-gradient-to-r from-blue-400 to-indigo-600 text-white'
                    : 'text-gray-400 bg-gray-50'
                }`}
              >
                <BuildingOfficeIcon className={`w-6 h-6 mx-auto mb-1 ${activeSection === 'basic' ? 'text-white' : 'text-white-500'}`} />
                <span className="sm:text-sm text-[10px]">Campaign Details</span>
                <div className="sm:text-xs mt-1 opacity-75 text-[8px]">Step 1</div>
                {formData.completionStage >= 1 && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-5 h-5 text-green-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  // if (validateStep1()) {
                  if (!validateStep1()) {
                    alert('Please complete Step 1 first');
                    return;
                  }
                  setActiveSection('config');
                }}
                className={`px-2 py-4 text-center font-semibold transition-all relative ${
                  activeSection === 'config'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                    : formData.completionStage >= 2 
                      ? 'bg-white text-gray-600 hover:bg-gray-50'
                      : 'bg-gray-50 text-gray-400'
                }`}
              >
                <AcademicCapIcon className={`w-6 h-6 mx-auto mb-1 ${activeSection === 'config' ? 'text-white' : formData.completionStage >= 2 ? 'text-purple-500' : 'text-gray-400'}`} />
                <span className="sm:text-sm text-[10px] ">Configuration</span>
                <div className="sm:text-xs mt-1 opacity-75 text-[8px]">Step 2</div>
                {formData.completionStage >= 2 && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-5 h-5 text-green-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {formData.completionStage < 2 && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-orange-600 bg-orange-100 rounded-full">!</span>
                  </div>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  // if (validateStep1()) {
                  if (!validateStep1()) {
                    alert('Please complete Step 1 first');
                    return;
                  }
                  setActiveSection('approval');
                }}
                className={`px-4 py-4 text-center font-semibold transition-all relative ${
                  activeSection === 'approval'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                    : formData.completionStage >= 3
                      ? 'bg-white text-gray-600 hover:bg-gray-50'
                      : 'bg-gray-50 text-gray-400'
                }`}
              >
                <UserIcon className={`w-6 h-6 mx-auto mb-1 ${activeSection === 'approval' ? 'text-white' : formData.completionStage >= 3 ? 'text-orange-500' : 'text-gray-400'}`} />
                <span className="sm:text-sm text-[10px]">Ad Approval</span>
                <div className="sm:text-xs mt-1 opacity-75 text-[8px]">Step 3</div>
                {formData.completionStage >= 3 && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-5 h-5 text-green-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {formData.completionStage < 3 && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-orange-600 bg-orange-100 rounded-full">!</span>
                  </div>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  // if (validateStep1()) {
                  if (!validateStep1()) {
                    alert('Please complete Step 1 first');
                    return;
                  }
                  setActiveSection('api');
                }}
                className={`px-6 py-4 text-center font-semibold transition-all relative ${
                  activeSection === 'api'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                    : formData.completionStage >= 4
                      ? 'bg-white text-gray-600 hover:bg-gray-50'
                      : 'bg-gray-50 text-gray-400'
                }`}
              >
                <ChartBarIcon className={`w-6 h-6 mx-auto mb-1 ${activeSection === 'api' ? 'text-white' : formData.completionStage >= 4 ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="sm:text-sm text-[10px]">API Config</span>
                <div className="sm:text-xs mt-1 opacity-75 text-[8px]">Step 4</div>
                {formData.completionStage >= 4 && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-5 h-5 text-green-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {formData.completionStage < 4 && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-orange-600 bg-orange-100 rounded-full">!</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Basic Information Section */}
              <ClientFormProvider value={{formData, setFormData}}>
             <div>
                { activeSection === 'basic' && (
                <Campaign 
                {...sharedProps}
                clientId={editClientId} 
                />
              )}
             </div>
            
          {/* Configuration Section */}
          {activeSection === 'config' && (
            <>
          <div>
            {/* <ClientFormProvider> */}
              <Configuration {...sharedProps}/>
            {/* </ClientFormProvider> */}
          </div>
          </>
          )}

          {/* Ad Approval Section */}
           {activeSection === 'approval' && (
             <>
            <div>
              {/* <ClientFormProvider> */}
                <AdApproval {...sharedProps}/>
              {/* </ClientFormProvider> */}
            </div>
          </>
          )}

          {/* API Configuration Section */}
          {activeSection === 'api' && (
            <>
          <div>
            {/* <ClientFormProvider> */}
              <ApiConfig {...sharedProps} />
            {/* </ClientFormProvider> */}
          </div>
          </>
          )}
          </ClientFormProvider>


          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <p className="text-red-700 text-sm font-medium">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center text-[10px] sm:text-[16px] justify-between sm:space-x-4 pt-4 space-x-1">
            {/* Section Navigation */}
            <div className="flex items-center sm:space-x-4 gap-1">
              {activeSection !== 'basic' && (
                <button
                  type="button"
                  onClick={handlePreviousSection}
                  className="px-2 sm:px-6 py-3 sm:py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all"
                >
                  ← Previous
                </button>
              )}
              
              {activeSection !== 'api' && (
                <button
                  type="button"
                  onClick={handleNextSection}
                  className="px-3 sm:px-6 py-3 sm:text-lg text-xs sm:py-3 bg-blue-100 text-blue-700 font-semibold rounded-xl hover:bg-blue-200 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all"
                >
                  Next →
                </button>
              )}
            </div>
            
            {/* Submit and Reset Buttons */}
            <div className="flex items-center space-x-2 sm:space-x-4 ml-4">
            <button
              type="button"
              onClick={handleReset}
              className="sm:px-8 px-3 py-3 sm:py-3 bg-orange-100 text-orange-700 font-semibold rounded-xl hover:bg-orange-200 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all transform hover:scale-105 "
            >
              
              <div className="flex flex-col items-center text-cente sm:flex-row items-center justify-center sm:space-x-2">
                <span className="sm:text-lg text-xs">Reset</span>
                <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 " />
              </div>
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-2 sm:px-8 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <div className="flex items-center space-x-2">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5" />
                    <span>{activeSection === 'api' ? 'Complete Client' : 'Save & Continue Later'}</span>
                  </>
                )}
              </div>
            </button>
            </div>
          </div>
        </form>
      </div>

              {/* Success Message */}
        {success && (
          <div className="mb-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl shadow-xl p-6 transform transition-all">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <CheckIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Client Created Successfully!</h3>
                <p className="text-green-50 text-sm">{successMessage || 'The client has been added to the system.'}</p>
              </div>
            </div>
          </div>
        )}

      {/* Excel Preview Modal */}
      {showExcelPreview && excelData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="w-8 h-8 text-white" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Excel Data Preview</h2>
                    <p className="text-green-100 text-sm">{excelData.length} client{excelData.length > 1 ? 's' : ''} found</p>
                  </div>
                </div> <button onClick={handleCloseExcelPreview} className="w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all">
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4">
                {excelData.map((row, index) => (
                  <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                          {row.clientName || 'Unnamed Client'} #{index + 1}
                        </h3>
                        <p className="text-sm text-gray-500">College ID: {row.collegeId || 'Not provided'}</p>
                      </div>
                      <button
                        onClick={() => handleApplyExcelData(index)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md flex items-center gap-2 font-semibold"
                      >
                        <CheckIcon className="w-4 h-4" />
                        Use This Data
                      </button>
                    </div>

                    {/* Data Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(row)
                        .filter(([key, value]) => {
                          if (!value) return false;
                          const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                          return displayValue.trim();
                        })
                        .map(([key, value]) => {
                          const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                          return (
                            <div key={key} className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="text-sm text-gray-800 font-medium break-words">
                              {displayValue}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Select "Use This Data" to populate the form with the client information
                </p>
                <button
                  onClick={handleCloseExcelPreview}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Delivery Modal */}
      {showDailyDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-xl">
              <h3 className="text-xl font-bold text-white capitalize">
                Add Daily Delivery - {currentDeliveryChannel}
              </h3>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dailyDeliveryDate}
                  onChange={(e) => setDailyDeliveryDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Delivery Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={dailyDeliveryAmount}
                  onChange={(e) => setDailyDeliveryAmount(e.target.value)}
                  placeholder="Enter delivery amount"
                  min="0"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opens
                </label>
                <input
                  type="number"
                  value={dailyDeliveryOpens}
                  onChange={(e) => setDailyDeliveryOpens(e.target.value)}
                  placeholder="Enter number of opens"
                  min="0"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Leads Delivered
                </label>
                <input
                  type="number"
                  value={dailyDeliveryLeadsDelivered}
                  onChange={(e) => setDailyDeliveryLeadsDelivered(e.target.value)}
                  placeholder="Enter leads delivered"
                  min="0"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700 font-medium">
                  💡 Open Rate % and CR % will be calculated automatically based on the data provided
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-200 rounded-b-xl flex gap-3">
              <button
                type="button"
                onClick={handleCloseDailyDeliveryModal}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDailyDelivery}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold"
              >
                Add Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    // </ClientFormProvider>

  );
}
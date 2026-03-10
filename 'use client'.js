'use client'
import axios from 'axios'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import SectionPermissionWrapper from '../shared/SectionPermissionWrapper';
// import { useClientForm } from '../contexts/ClientFormContext'
import { CLIENT_SECTIONS } from '@/utils/rbacPermissions';
import {
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  XMarkIcon,
  CheckIcon,
  ChartBarIcon,
  PlusIcon,
  CalendarIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
// import { fetchClients } from '@/axiosApis/clients/clientApi';
// import { getAllUsers } from '@/axiosApis/user/userApi';  //Campaign API
// import { getExportTemplates } from '@/axiosApis/leads/leadApi';   //Campaign API
// import { fetchColleges, fetchCoursesByCollege, fetchCoursesByProgrammes, fetchStates, fetchCities, fetchCitiesByState } from '@/axiosApis/colleges/collegeApi';    //Campaign API




  const statusOptions = [
    { value: 'Active', color: 'green', bgColor: 'bg-green-50', borderColor: 'border-green-500', textColor: 'text-green-700', hoverBorder: 'hover:border-green-400' },
    { value: 'Inactive', color: 'gray', bgColor: 'bg-gray-50', borderColor: 'border-gray-500', textColor: 'text-gray-700', hoverBorder: 'hover:border-gray-400' },
    { value: 'Pending', color: 'yellow', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-500', textColor: 'text-yellow-700', hoverBorder: 'hover:border-yellow-400' },
    { value: 'Suspended', color: 'red', bgColor: 'bg-red-50', borderColor: 'border-red-500', textColor: 'text-red-700', hoverBorder: 'hover:border-red-400' }
  ];

  const institutionTypes = [
    'University',
    'College',
    'School',
    'Other'
  ];


  const getCurrentMonth = () => {
    const today = new Date()
    return MONTHS[today.getMonth()]
  }

  const getCurrentMonthIndex = () => {
    return new Date().getMonth();
  };

  const getCurrentYear = () => {
  return new Date().getFullYear().toString();
};

  const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];


const getAcademicYearFromDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan

  if (month >= 3) { // April onwards
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
};

const generateAcademicYears = (range = 5) => {
  const currentAcademicYear = getAcademicYearFromDate();
  const [startYear] = currentAcademicYear.split('-');
  const baseYear = parseInt(startYear);


  const years = [];

  for (let i = -range; i <= range; i++) {
    const year = baseYear + i;
    const nextYearShort = String(year + 1).slice(-2);
    years.push(`${year}-${nextYearShort}`);
  }

  return years.sort((a, b) => {
    const aStart = parseInt(a.split('-')[0]);
    const bStart = parseInt(b.split('-')[0]);
    return bStart - aStart;
  });
};

const maxLength = 29

const MAX_COMPETITORS = 5;


export default function Campaign(props) {
//   const clientForm = useClientForm()
//   if (!clientForm) {
//   console.error("Campaign must be used inside ClientFormProvider");
//   return null;
// }
//   const { formData, setFormData } = useClientForm()

// Course details 
  const [programPercentages, setProgramPercentages] = useState({});
  const [percentageError, setPercentageError] = useState(false);

  // Application Form section
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false)
  const [applicationCourseSearch, setApplicationCourseSearch] = useState('')
  // const [details, setDetails] = useState(["", "", ""]);   //restrict max char
  const [activeToastIndex, setActiveToastIndex] = useState(null);  // warning timer 

  // Competitor Performance
  const [allCompetitors, setAllCompetitors] = useState([
    "Shiksha",
    "CD",
    "CDKO",
    "C360",
    "KApp"
  ]);
  const [selectedCompetitors, setSelectedCompetitors] = useState([
    "Shiksha",
  ]);
  const [competitorYear, setCompetitorYear] = useState(() => getAcademicYearFromDate());
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [savedFilters, setSavedFilters] = useState(null);
  const [filterSaved, setFilterSaved] = useState(false);
  const [isCompetitorDropdownOpen, setIsCompetitorDropdownOpen] = useState(false);
  const [competitorSearch, setCompetitorSearch] = useState("");
  const [topMetric, setTopMetric] = useState("");   //Top Competitors max 5
  const [startMonth, setStartMonth] = useState("January");
  const [endMonth, setEndMonth] = useState("December");
  const [collegeProgrammes, setCollegeProgrammes] = useState([]);
  const [programmesLoading, setProgrammesLoading] = useState(false);
  const [showAllProgrammes, setShowAllProgrammes] = useState(false);
  const [brandingDropdownOpen, setBrandingDropdownOpen] = useState(false);
  const [brandingSelection, setBrandingSelection] = useState({
    main: "yes"
  });
  const [commercialSelection, setCommercialSelection] = useState({
  main: []
});
  const YEAR_OPTIONS = useMemo(() => generateAcademicYears(2), []);


    const {
    formData,
    setFormData,
    errors,
    setErrors,
    canAccess,
    canEdit,
    isEditMode,
    handleInputChange,
    emailInput,
    coursesLoading,
    selectedStateId,
    selectedTopStates,
    selectedTopCities,
    apiExcelInputRef,
    handleApiExcelUpload,
    apiExcelUploadError,
    crmExcelFilesToUpload,
    monthsArray,
    courseSearch,
    loadPendingClients,
    handleDownloadBrandingFile,
    loadColleges,
    loadLocations,
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
    priorityCitiesLoading,
    groupedCourses,
    courseOptions,
    setEmailInput,
    filteredCities,
    setSelectedTopStates,
    filteredPriorityCitiesFromApi,
    setPriorityCitySearchTerm,
    brandingFileInputRef,
    handleBrandingFileUpload,
    handleDeleteSavedBrandingFile,
    brandingUploadError,
    brandingFilesToUpload,
    savedBrandingFiles,
    handleRemoveBrandingFile,
    handleOpenDailyDeliveryModal,
    handleRemoveDailyDelivery,
    limitCalculation,
    coursePushLimits,
    handleCoursePushLimitChange,
    handleCourseToggle,
    setCourseSearch,
    handleMonthlyLimitChange,
    handleClearCourseFilters,
    handleExcelUpload,
    handleStateSelect,
    handleCitySelect,
    collegesError,
    colleges,
    collegesLoading,
    locationLoading,
    locationOptions,
    citiesLoading,
    cityOptionsToRender,
    stateOptionsToRender,
    collegeSearchTerm,
    selectedCityId,
    selectedCourseLevelIds,
    setCollegeSearchTerm,
    setSelectedStateId,
    setSelectedTopCities,
    setSelectedCityId,
    setShowAllStates,
    // selectedCourseSet,
    handleTopCitySelect,
    clientId,
  } = props;


const programDistribution = useMemo(() => {
  const courses = formData.courses || [];
  if (!courses.length) return {};

  const firstCourse = courses[0];

  const dailyLimit = Number(limitCalculation.dailyPushLimit) || 0;
  const firstLeads = Number(coursePushLimits[firstCourse]) || 0;

  const distribution = {
    [firstCourse]: firstLeads
  };

  const remainingLeads = Math.max(dailyLimit - firstLeads, 0);
    if (remainingLeads <= 0) return distribution;


  const remainingCourses = courses.slice(1);

  let usedPercent = 0;
  let emptyCourses = [];

  remainingCourses.forEach(course => {

    const percent = programPercentages[course];

    if (percent === "" || percent === undefined) {
      emptyCourses.push(course);
    } else {
      usedPercent += Number(percent);
    }

  });

  if (usedPercent > 100) return distribution;

  const remainingPercent = Math.max(100 - usedPercent, 0);

  const autoPercent =
    emptyCourses.length > 0
      ? Math.floor(remainingPercent / emptyCourses.length)
      : 0;

  let usedLeads = 0;

  const anyPercentageEntered = remainingCourses.some(
  c => Number(programPercentages[c]) > 0
);

  remainingCourses.forEach((course, index) => {

  const percent = Number(programPercentages[course]) || 0;

  let leads = 0;

  if (anyPercentageEntered) {

    leads = Math.floor((remainingLeads * percent) / 100);

    if (index === remainingCourses.length - 1) {
      leads = Math.max(remainingLeads - usedLeads, 0);
    }

  }

  distribution[course] = leads;

  usedLeads += leads;

});

  // remainingCourses.forEach((course, index) => {

  //   const percent =
  //     programPercentages[course] === "" || programPercentages[course] === undefined
  //       ? autoPercent
  //       : Number(programPercentages[course]);

  //   let leads = Math.floor((remainingLeads * percent) / 100);

  //   leads = Math.max(leads, 0);

  //   if (index === remainingCourses.length - 1) {
  //     leads = Math.max(remainingLeads - usedLeads, 0);
  //   }

  //   distribution[course] = leads;

  //   usedLeads += leads;

  // });

  return distribution;

}, [
  formData.courses,
  programPercentages,
  coursePushLimits,
  limitCalculation.dailyPushLimit
]);

  // Courses details Percentage redistribution
// const programDistribution = useMemo(() => {

//   const courses = formData.courses || [];
//   if (!courses.length) return {};

//   const firstCourse = courses[0];

//   const dailyLimit = Number(limitCalculation.dailyPushLimit) || 0;

//   const firstLeads = Number(coursePushLimits[firstCourse]) || 0;

//   const remainingLeads = Math.max(dailyLimit - firstLeads, 0);

//   const distribution = {
//     [firstCourse]: firstLeads
//   };

//   const remainingCourses = courses.slice(1);

//   let usedPercent = 0;
//   let emptyCourses = [];

//   remainingCourses.forEach(course => {

//     const percent = programPercentages[course];

//     if (percent === "" || percent === undefined) {
//       emptyCourses.push(course);
//     } else {
//       usedPercent += Number(percent);
//     }

//   });

//   const remainingPercent = Math.max(100 - usedPercent, 0);

//   const autoPercent =
//     emptyCourses.length > 0
//       ? Math.floor(remainingPercent / emptyCourses.length)
//       : 0;

//   const finalPercentages = {};

//   remainingCourses.forEach(course => {

//     if (programPercentages[course] === "" || programPercentages[course] === undefined) {
//       finalPercentages[course] = autoPercent;
//     } else {
//       finalPercentages[course] = Number(programPercentages[course]);
//     }

//   });

//   let usedLeads = 0;

//   remainingCourses.forEach((course, index) => {

//     let leads = Math.floor((remainingLeads * finalPercentages[course]) / 100);

//     if (index === remainingCourses.length - 1) {
//       leads = remainingLeads - usedLeads;
//     }

//     distribution[course] = leads;

//     usedLeads += leads;

//   });

//   return distribution;

// }, [
//   formData.courses,
//   programPercentages,
//   coursePushLimits,
//   limitCalculation.dailyPushLimit
// ]);

// const programDistribution = useMemo(() => {
//   const courses = formData.courses || [];
  
//   if (!courses.length) return {};

//   const firstCourse = courses[0];
//   const dailyLimit = Number(limitCalculation.dailyPushLimit) || 0;
//   const firstLeads = Number(coursePushLimits[firstCourse]) || 0;
//   const remainingLeads = Math.max(dailyLimit - firstLeads, 0);
//   const distribution = {
//     [firstCourse]: firstLeads
//   };

//   let usedLeads = 0;
//   const remainingCourses = courses.slice(1);
//   remainingCourses.forEach((course, index) => {
//     const percent = Math.round(Number(programPercentages[course]) || 0);
//     let leads = Math.floor((remainingLeads * percent) / 100);
//     // last course gets remaining leads to avoid rounding loss
//     if (index === remainingCourses.length - 1) {
//       leads = remainingLeads - usedLeads;
//     }
//     distribution[course] = leads;
//     usedLeads += leads;
//   });

//   return distribution;

// }, [
//   limitCalculation.dailyPushLimit,
//   coursePushLimits,
//   programPercentages,
//   formData.courses
// ]);


const handlePercentageChange = (course, value) => {

  const newPercent = value === "" ? "" : Math.min(Math.max(Number(value), 0), 100);

  setProgramPercentages(prev => {

    const updated = {
      ...prev,
      [course]: newPercent
    };

    const courses = formData.courses?.slice(1) || [];

    let totalPercent = 0;

    courses.forEach(c => {
      const p = updated[c];
      if (p !== "" && p !== undefined) {
        totalPercent += Number(p);
      }
    });

    if (totalPercent > 100) {
      setPercentageError(true);
    } else {
      setPercentageError(false);
    }

    return updated;
  });
};


// const handlePercentageChange = (course, value) => {

//   const percentage = Math.min(Math.max(Number(value), 0), 100);

//   setProgramPercentages(prev => ({
//     ...prev,
//     [course]: value === "" ? "" : percentage
//   }));

// };


// const handlePercentageChange = (course, value) => {
//   const percentage = Math.min(Math.max(Number(value), 0), 100);

//   const courses = formData.courses || [];
//   const remainingCourses = courses.slice(1); // skip first program

//   setProgramPercentages(prev => {
//     const updated = { ...prev };
//     // set the chosen percentage
//     updated[course] = percentage;

//     // calculate remaining %
//     const remainingPercent = 100 - percentage;
//     const otherCourses = remainingCourses.filter(c => c !== course);

//     if (otherCourses.length > 0) {
//       const equalPercent = remainingPercent / otherCourses.length;

//       otherCourses.forEach(c => {
//         updated[c] = Math.round(equalPercent);
//       });
//     }

//     return updated;
//   });
// };



  // Application Form section
  const details = [
  formData.applicationFormDetail1 || "",
  formData.applicationFormDetail2 || "",
  formData.applicationFormDetail3 || ""
];

  const selectedCourseSet = useMemo(() => {
    const entries = Array.isArray(formData.courses) ? formData.courses : [];
    return new Set(
      entries
        .map((course) => course?.toString().trim().toLowerCase())
        .filter((value) => Boolean(value))
    );
  }, [formData.courses]);
  
//Derive applicationCourses from formData
  const applicationCourses = Array.isArray(formData.applicationFormCourses) 
    ? formData.applicationFormCourses 
    : [];



  const handleToggleCourseDropdown = () => {
    setIsCourseDropdownOpen(prev => !prev)
  }

  const handleApplicationCourseSearchChange = (e) => {
  setApplicationCourseSearch(e.target.value);
};

  const handleApplicationCourseSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddApplicationCourseFromSearch()
    } 
    if (e.key === 'Escape') {
      setApplicationCourseSearch('')
    }
  }

    const handleAddApplicationCourseFromSearch = () => {
    // checking  string.trim()
    if (!applicationCourseSearch.trim()) return
    const trimmedCourse = applicationCourseSearch.trim()

    // update formData.applicationFormCourses instead of local state
    setFormData((prev) => {
      const existingCourses = Array.isArray(prev.applicationFormCourses) ? prev.applicationFormCourses : []
      const alreadySelected = existingCourses.some(
        (course) => course?.toString().trim().toLowerCase() === trimmedCourse.toLowerCase()
      )
      if (alreadySelected) return prev
      return {
        ...prev,
        applicationFormCourses: [...existingCourses, trimmedCourse]
      }
    })
    setApplicationCourseSearch('')
  }


  const handleApplicationCourseToggle = (courseName = '') => {
    const trimmedCourse = courseName.trim();
    if (!trimmedCourse) return;

    //  update formData.applicationFormCourses
    setFormData((prev) => {
      const existingCourses = Array.isArray(prev.applicationFormCourses) ? prev.applicationFormCourses : [];
      const hasCourse = existingCourses.some(
        (course) => course?.toString().trim().toLowerCase() === trimmedCourse.toLowerCase()
      );
      return {
        ...prev,
        applicationFormCourses: hasCourse
          ? existingCourses.filter(
              (course) => course?.toString().trim().toLowerCase() !== trimmedCourse.toLowerCase()
            )
          : [...existingCourses, trimmedCourse]
      };
    });
  }



  // Converts "2026" → "2025-26", leaves "2025-26" unchanged
const toAcademicYear = (year) => {
  if (!year) return null;
  if (String(year).includes('-')) return String(year);
  const y = parseInt(year);
  if (isNaN(y)) return null;
  return `${y - 1}-${String(y).slice(-2)}`;
};

  // Save Filters handler
const handleSaveFilters = () => {
  const filters = {
    startMonth,
    endMonth,
    topMetric,
    selectedCompetitors,
    year: competitorYear,
    savedAt: new Date().toISOString()
  };

  // 1. Save to component state
  setSavedFilters(filters);

  // 2. Save to sessionStorage (persists during browser session)
  sessionStorage.setItem(
    `competitorFilters_${formData.id || 'new'}`,
    JSON.stringify(filters)
  );

  // 3. Show success feedback
  setFilterSaved(true);
  setTimeout(() => setFilterSaved(false), 2500);
};
  

  // Client College for Competitor Performance
  const clientCollegeName = useMemo(() => {
  if (!formData.collegeId || !colleges?.length) {
    return "College Name";
  }

  const selectedCollege = colleges.find(college =>
    String(college.collegeId) === String(formData.collegeId) ||
    String(college.cwId) === String(formData.collegeId)
  );

  if (!selectedCollege) return "College Name";

  const cwId = selectedCollege.cwId || selectedCollege.collegeId;

  return `(ID: ${cwId}) ${selectedCollege.name}`;
}, [formData.collegeId, colleges]);



 const filteredApplicationGroupedCourses = useMemo(() => {
    if (!applicationCourseSearch.trim()) {
      return groupedCourses;
    }
    const searchLower = applicationCourseSearch.toLowerCase()
    return groupedCourses
      .map(group => ({
        ...group,
        courses: group.courses.filter(course => course?.name?.toLowerCase().includes(searchLower))
      }))
      .filter(group => group.courses.length > 0)
  }, [groupedCourses, applicationCourseSearch])

  // reads from formData.applicationFormCourses correctly
  const selectedApplicationCourseSet = useMemo(() => {
    const entries = Array.isArray(formData.applicationFormCourses) ? formData.applicationFormCourses : [];
    return new Set(
      entries
        .map((course) => course?.toString().trim().toLowerCase())
        .filter((value) => Boolean(value))
    );
  }, [formData.applicationFormCourses]);


// Competitor popup
const filteredCompetitors = useMemo(() => {
  return allCompetitors.filter(comp =>
    comp.toLowerCase().includes(competitorSearch.toLowerCase())
  );
}, [competitorSearch]);


// Filter Months
const filteredMonths = useMemo(() => {
  const startIndex = MONTHS.indexOf(startMonth);
  const endIndex = MONTHS.indexOf(endMonth);

  if (startIndex === -1 || endIndex === -1) return MONTHS;

  // If start > end, prevent invalid range
  if (startIndex > endIndex) return MONTHS.slice(startIndex);

  return MONTHS.slice(startIndex, endIndex + 1);
}, [startMonth, endMonth]);

// CREATE NEW COMPETTOR
const addCompetitor = () => {
  const name = newCompetitorName.trim();

  if (!name) return;

  // prevent duplicates
  if (allCompetitors.includes(name)) {
    alert("Competitor already exists");
    return;
  }

  setAllCompetitors(prev => [...prev, name]);
  setNewCompetitorName("");
};

// TOTALS
const totals = useMemo(() => {
  const yearData = formData.competitorPerformance?.[competitorYear];
  if (!yearData) return null;

  const total = {
    clientCollege: {
    leads: 0,
    apps: 0,
    admissions: 0
  },
    mainCollege: {
      leads: 0,
      apps: 0,
      admissions: 0,
      appRejected: 0,
    },
    competitors: {
      leads: 0,
      apps: 0,
      admissions: 0,
    }
  };


  // initialize competitors totals
  allCompetitors.forEach(comp => {
    if (!total.competitors[comp]) {
      total.competitors[comp]  = {
      leads: 0,
      apps: 0,
      admissions: 0,
    }};
  });
  

  filteredMonths.forEach(month => {
    const monthData = yearData[month];
    if (!monthData) return;

    total.clientCollege.leads += monthData.clientCollege?.leads || 0;
    total.clientCollege.apps += monthData.clientCollege?.apps || 0;
    total.clientCollege.admissions += monthData.clientCollege?.admissions || 0;

    // Main College
    total.mainCollege.leads += monthData.mainCollege.leads || 0;
    total.mainCollege.apps += monthData.mainCollege.apps || 0;
    total.mainCollege.admissions += monthData.mainCollege.admissions || 0;
    total.mainCollege.appRejected += monthData.mainCollege.appRejected || 0;

    // Competitors
    allCompetitors.forEach(comp => {
      if (!total.competitors[comp]) {
        total.competitors[comp] = { leads: 0, apps: 0, admissions: 0 };
      }

      total.competitors[comp].leads += monthData.competitors?.[comp]?.leads || 0;
      total.competitors[comp].apps += monthData.competitors?.[comp]?.apps || 0;
      total.competitors[comp].admissions += monthData.competitors?.[comp]?.admissions || 0;
    });
  });

  return total;
}, [formData.competitorPerformance, competitorYear, allCompetitors, filteredMonths]);



const formatDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// useEffect(() => {
//   if (!formData.year) return;
//   initializeCompetitorPerformance(formData.year); // will use "2025-26" once dropdown is fixed
// }, [formData.year]);


const initializeCompetitorPerformance = (academicYear) => {
  // const academicYear = toAcademicYear(selectedYear); //  "2026" → "2025-26"
  if (!academicYear) return;

  setFormData(prev => {
     if (prev.competitorPerformance?.[academicYear]) return prev; // already exists, skip

    // const existingYear = prev.competitorPerformance?.[academicYear];

    // if (existingYear) return prev;

    const yearData = {
      commercials: {
        mainCollege: { cpl: 0, cpa: 0, cps: 0 },
        competitors: allCompetitors.reduce((acc, name) => {
          acc[name] = { cpl: 0, cpa: 0, cps: 0 };
          return acc;
        }, {})
      }
    };

    MONTHS.forEach((month) => {
      yearData[month] = {
        isMonthLocked: false,
        clientCollege: {
          leads: 0,
          apps: 0,
          admissions: 0
        },

        mainCollege: {
          leads: 0,
          apps: 0,
          admissions: 0,
          appRejected: 0
        },
        competitors: allCompetitors.reduce((acc, name) => {
          acc[name] = { leads: 0, apps: 0, admissions: 0 };
          return acc;
        }, {})

        // competitors: allCompetitors.reduce((acc, name) => {
        //   acc[name] = {
        //     leads: 0,
        //     apps: 0,
        //     admissions: 0
        //   };
        //   return acc;
        // }, {})
      };
    });

    return {
      ...prev,
      competitorPerformance: {
        ...(prev.competitorPerformance || {}),
        [academicYear]: yearData 
        // [selectedYear]: yearData
      }
    };
  });
};




const handleClientCollegeChange = (month, field, value) => {
  const academicYear = competitorYear;

  setFormData(prev => {
    if (!prev.competitorPerformance?.[academicYear]?.[month]) return prev;

    return {
      ...prev,
      competitorPerformance: {
        ...prev.competitorPerformance,
        [academicYear]: {
          ...prev.competitorPerformance[academicYear],
          [month]: {
            ...prev.competitorPerformance[academicYear][month],
            clientCollege: {
              ...prev.competitorPerformance[academicYear][month].clientCollege,
              [field]: Number(value)
            }
          }
        }
      }
    };
  });
};

const handleMainCollegeChange = (month, field, value) => {
  const academicYear = competitorYear; // ✅
  // const year = formData.year;

  setFormData(prev => {
    if (!prev.competitorPerformance?.[academicYear]?.[month]) return prev;

    return {
      ...prev,
      competitorPerformance: {
        ...prev.competitorPerformance,
        [academicYear]: {
          ...prev.competitorPerformance[academicYear],
          [month]: {
            ...prev.competitorPerformance[academicYear][month],
            mainCollege: {
              ...prev.competitorPerformance[academicYear][month].mainCollege,
              [field]: Number(value)
            }
          }
        }
      }
    };
  });
};

const handleCompetitorChange = (month, competitor, field, value) => {
  const academicYear = competitorYear; // ✅
  // const year = formData.year;

  setFormData(prev => {
    if (!prev.competitorPerformance?.[academicYear]?.[month]) return prev;

    return {
      ...prev,
      competitorPerformance: {
        ...prev.competitorPerformance,
        [academicYear]: {
          ...prev.competitorPerformance[academicYear],
          [month]: {
            ...prev.competitorPerformance[academicYear][month],
            competitors: {
              ...prev.competitorPerformance[academicYear][month].competitors,
              [competitor]: {
                ...prev.competitorPerformance[academicYear][month].competitors[competitor],
                [field]: Number(value)
              }
            }
          }
        }
      }
    };
  });
};


// Deal Type/Size handler
const handleDealConfigChange = (type, field, value, compName = null) => {
  setFormData(prev => {
    const academicYear = competitorYear 
    const updated = { ...prev };

    if (!updated.competitorPerformance[academicYear]) return prev; // guard

    if (!updated.competitorPerformance[academicYear].dealConfig) {
      updated.competitorPerformance[academicYear].dealConfig = {
        main: {},
        competitors: {}
      };
    }

    if (type === "main") {
      updated.competitorPerformance[academicYear].dealConfig.main[field] =
        Number(value);
    }

    if (type === "competitor") {
      if (!updated.competitorPerformance[academicYear].dealConfig.competitors[compName]) {
        updated.competitorPerformance[academicYear].dealConfig.competitors[compName] = {};
      }

      updated.competitorPerformance[academicYear]
        .dealConfig
        .competitors[compName][field] = Number(value);
    }

    return updated;
  });
};

// handle Branding YES/NO dropdown
const setBranding = (college, value) => {
  setBrandingSelection(prev => ({
    ...prev,
    [college]: value
  }));

  setBrandingDropdownOpen(null);
};

const toggleCommercial = (college, type) => {

  setCommercialSelection(prev => {

    const current = prev[college] || [];

    // if already selected → remove
    if (current.includes(type)) {
      return {
        ...prev,
        [college]: []
      };
    }

    // allow ONLY one
    return {
      ...prev,
      [college]: [type]
    };

  });

};

const handleCommercialValueChange = (collegeType, competitorName, field, value) => {
  setFormData(prev => {
    const academicYear = competitorYear; 

    const updated = { ...prev };

    if (!updated.competitorPerformance) {
      updated.competitorPerformance = {};
    }

    if (!updated.competitorPerformance[academicYear]) {
      updated.competitorPerformance[academicYear] = {};
    }

    if (!updated.competitorPerformance[academicYear].commercials) {
      updated.competitorPerformance[academicYear].commercials = {
        mainCollege: {},
        competitors: {}
      };
    }

    if (collegeType === "main") {

      updated.competitorPerformance[academicYear].commercials.mainCollege = {
        ...updated.competitorPerformance[academicYear].commercials.mainCollege,
        [field]: Number(value)
      };

    } else {

      updated.competitorPerformance[academicYear].commercials.competitors[competitorName] = {
        ...updated.competitorPerformance[academicYear].commercials.competitors[competitorName],
        [field]: Number(value)
      };

    }

    return { ...updated };
  });
};


// competitor perfromance save button
const Savebtn = () => {
//   onClick = alert("Competitor Performance saved successfully!");

  // const cleaned = JSON.parse(JSON.stringify(formData));

  // Object.keys(cleaned.competitorPerformance || {}).forEach(year => {

  //   const commercials = cleaned.competitorPerformance[year]?.commercials;

  //   if (!commercials) return;

  //   Object.keys(commercials.mainCollege || {}).forEach(key => {
  //     commercials.mainCollege[key] = Number(commercials.mainCollege[key]);
  //   });

  //   Object.keys(commercials.competitors || {}).forEach(comp => {
  //     Object.keys(commercials.competitors[comp]).forEach(key => {
  //       commercials.competitors[comp][key] =
  //         Number(commercials.competitors[comp][key]);
  //     });
  //   });

  // });

};


  // DECLARING USESTATE
// const [colleges, setColleges] = useState([]);
// const [collegesLoading, setCollegesLoading] = useState(false);
// const [collegesError, setCollegesError] = useState('');
// const [locationOptions, setLocationOptions] = useState({
//   states: [],
//   cities: []
// });
// const [locationLoading, setLocationLoading] = useState(false);
// const [citiesLoading, setCitiesLoading] = useState(false);
// const [loadedStateIds, setLoadedStateIds] = useState(new Set());
// const [locationError, setLocationError] = useState('');
// const [templatesLoading, setTemplatesLoading] = useState(false); //Campaign API
// const [exportTemplates, setExportTemplates] = useState([]);// campaign API
// const [pendingClients, setPendingClients] = useState([]);
// const [pendingClientsLoading, setPendingClientsLoading] = useState(false);
// const [brandingFilesToUpload, setBrandingFilesToUpload] = useState([]);
// const [savedBrandingFiles, setSavedBrandingFiles] = useState([]);
// const [brandingUploadError, setBrandingUploadError] = useState('');


  // const loadColleges = useCallback(async () => {
  //   setCollegesLoading(true);
  //   setCollegesError('');
  //   try {
  //     const result = await fetchColleges();
  //     if (result.success) {
  //       setColleges(result.data || []);
  //     } else {
  //       setColleges([]);
  //       const errorMessage = result.message || 'Failed to fetch colleges';
  //       setCollegesError(errorMessage);
  //       console.error('Failed to fetch colleges:', errorMessage);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching colleges:', error);
  //     setColleges([]);
  //     setCollegesError('Failed to fetch colleges');
  //   } finally {
  //     setCollegesLoading(false);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);


  // const loadLocations = useCallback(async () => {
  //   setLocationLoading(true);
  //   setLocationError('');
  //   try {
  //     // Only fetch states initially - cities will be loaded on-demand
  //     const statesResult = await fetchStates();
      
  //     if (statesResult.success) {
  //       // Map states with id and name
  //       const statesData = (statesResult.data || []).map(state => ({
  //         id: state.id,
  //         name: state.name
  //       }));
        
  //       setLocationOptions({
  //         states: statesData,
  //         cities: [], // Don't load all cities upfront
  //         topStates: [],
  //         topCities: []
  //       });
  //       console.log('✅ Loaded states:', statesData.length);
  //     } else {
  //       setLocationOptions({ states: [], cities: [], topStates: [], topCities: [] });
  //       const errorMessage = statesResult.message || 'Failed to fetch states';
  //       setLocationError(errorMessage);
  //       console.error('Failed to fetch states:', errorMessage);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching states:', error);
  //     setLocationOptions({ states: [], cities: [], topStates: [], topCities: [] });
  //     setLocationError('Failed to fetch states');
  //   } finally {
  //     setLocationLoading(false);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // const loadCitiesByState = useCallback(async (stateId) => {
  //   if (!stateId) {
  //     return;
  //   }

  //   // Avoid reloading if we've already loaded cities for this state
  //   if (loadedStateIds.has(stateId)) {
  //     return;
  //   }

  //   setCitiesLoading(true);
  //   try {
  //     const result = await fetchCitiesByState(stateId, '');
      
  //     if (result.success) {
  //       const citiesData = (result.data || []).map(city => ({
  //         id: city.id,
  //         name: city.name,
  //         stateId: city.state_id || city.stateId || stateId
  //       }));

  //       setLocationOptions(prev => {
  //         // Merge with existing cities from other states
  //         const existingCities = prev.cities.filter(c => c.stateId !== stateId);
  //         const allCities = [...existingCities, ...citiesData];
          
  //         // Remove duplicates by id
  //         const uniqueCities = Array.from(
  //           new Map(allCities.map(city => [city.id, city])).values()
  //         );

  //         return {
  //           ...prev,
  //           cities: uniqueCities
  //         };
  //       });

  //       setLoadedStateIds(prev => new Set([...prev, stateId]));

  //       console.log(`✅ Loaded ${citiesData.length} cities for state ${stateId}`);
  //     }
  //   } catch (error) {
  //     console.error('Error loading cities by state:', error);
  //   } finally {
  //     setCitiesLoading(false);
  //   }
  // }, [loadedStateIds]);

  // const handleStateSelect = (e) => {
  //   const { value } = e.target;
  //   const previousStateId = selectedStateId;
  //   const selectedState = locationOptions.states.find((state) => String(state.id) === value);

  //   setSelectedStateId(value);
  //   setSelectedCityId((prevCityId) => (previousStateId !== value ? '' : prevCityId));
  //   setFormData((prev) => ({
  //     ...prev,
  //     state: selectedState?.name || '',
  //     city: previousStateId !== value ? '' : prev.city
  //   }));

  //   // Load cities for the selected state
  //   if (value) {
  //     loadCitiesByState(value);
  //   }

  //   if (errors.state) {
  //     setErrors((prev) => ({
  //       ...prev,
  //       state: ''
  //     }));
  //   }
  //   if (errors.city && previousStateId !== value) {
  //     setErrors((prev) => ({
  //       ...prev,
  //       city: ''
  //     }));
  //   }
  // };

  // const handleCitySelect = (e) => {
  //   const { value } = e.target;
  //   const selectedCity = locationOptions.cities.find((city) => String(city.id) === value);

  //   setSelectedCityId(value);
  //   setFormData((prev) => ({
  //     ...prev,
  //     city: selectedCity?.name || ''
  //   }));

  //   if (errors.city) {
  //     setErrors((prev) => ({
  //       ...prev,
  //       city: ''
  //     }));
  //   }
  // };

    const handleAddEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailInput.trim()) {
      return;
    }
    
    if (!emailRegex.test(emailInput)) {
      setErrors(prev => ({ ...prev, emailInput: 'Invalid email format' }));
      return;
    }
    
    if (emailInput.toLowerCase() === formData.email.toLowerCase()) {
      setErrors(prev => ({ ...prev, emailInput: 'This email is already the primary email' }));
      return;
    }
    
    if (formData.additionalEmails.some(e => e.toLowerCase() === emailInput.toLowerCase())) {
      setErrors(prev => ({ ...prev, emailInput: 'This email is already added' }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      additionalEmails: [...prev.additionalEmails, emailInput.trim()]
    }));
    setEmailInput('');
    setErrors(prev => ({ ...prev, emailInput: '' }));
  };

   const handleRemoveEmail = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      additionalEmails: prev.additionalEmails.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleEmailInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };


// handles add new competitor 
useEffect(() => {
  if (!competitorYear) return;

  setFormData(prev => {
    const yearData = prev.competitorPerformance?.[competitorYear];
    if (!yearData) return prev;

    allCompetitors.forEach(comp => {
      if (!yearData.commercials?.competitors?.[comp]) {
        yearData.commercials.competitors[comp] = {
          cpl: 0,
          cpa: 0,
          cps: 0
        };
      }
    });

    return { ...prev };
  });

}, [allCompetitors]);


useEffect(() => {
  if (!competitorYear) return;

  setFormData(prev => {
    const yearData = prev.competitorPerformance?.[competitorYear];
    if (!yearData) return prev;

    const updated = { ...prev };

    allCompetitors.forEach(comp => {
      if (!yearData.commercials?.competitors?.[comp]) {
        yearData.commercials.competitors[comp] = { cpl: 0, cpa: 0, cps: 0 };
      }
    });

    return updated;
  });

}, [allCompetitors]);

useEffect(() => {
  if (!competitorYear) return;
  initializeCompetitorPerformance(competitorYear);
}, [competitorYear]);


useEffect(() => {
  const handleClickOutside = (e) => {
    if (!e.target.closest(".competitor-dropdown")) {
      setIsCompetitorDropdownOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

useEffect(() => {
  const fetchProgrammes = async () => {
    if (!formData.collegeId) {
      setCollegeProgrammes([]);
      return;
    }

    try {
      setProgrammesLoading(true);

      const response = await axios.get(
        `https://cdn.collegewollege.com/api/${formData.collegeId}/programmes`
      );

      if (response.data?.status) {
        setCollegeProgrammes(response.data.data || []);
      } else {
        setCollegeProgrammes([]);
      }
    } catch (error) {
      console.error("Failed to fetch programmes:", error);
      setCollegeProgrammes([]);
    } finally {
      setProgrammesLoading(false);
    }
  };

  fetchProgrammes();
}, [formData.collegeId]);

// Effective Commercials 
const calculateEffectiveCommercial = (totalAmount, metric) => {
  const value = Number(metric) || 0;
  const total = Number(totalAmount) || 0;

  if (!value) return 0;

  return (total / value).toFixed(2);
};

// % share of total, for main college only
const calculateShare = (mainValue, clientValue) => {
  const main = Number(mainValue) || 0;
  const client = Number(clientValue) || 0;

  if (!client) return "0%";

  return ((main / client) * 100).toFixed(1) + "%";
};

  // Total W/O Branding : 
const getDealTotal = (type, comp = null) => {
  const deal =
    type === "main"
      ? formData.competitorPerformance?.[competitorYear]?.dealConfig?.main
      : formData.competitorPerformance?.[competitorYear]?.dealConfig?.competitors?.[comp];

  const branding = Number(deal?.brandingAmount) || 0;
  const delivery = Number(deal?.deliveryAmount) || 0;

  return branding + delivery;
};

// Top 5 Competitors based on CPA/CPL/CPS
const topCompetitors = useMemo(() => {
  if (!totals) return [];

  const result = selectedCompetitors.map(comp => {

    const data = totals.competitors?.[comp] || {};
    const dealTotal = getDealTotal("competitor", comp);

    let metricValue = 0;

    if (topMetric === "CPL") {
      metricValue = calculateEffectiveCommercial(dealTotal, data.leads);
    }

    if (topMetric === "CPA") {
      metricValue = calculateEffectiveCommercial(dealTotal, data.apps);
    }

    if (topMetric === "CPS") {
      metricValue = calculateEffectiveCommercial(dealTotal, data.admissions);
    }

    return {
      name: comp,
      value: Number(metricValue) || 0
    };

  });

  return result
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_COMPETITORS);

}, [totals, selectedCompetitors, topMetric]);


const topCompetitorNames = useMemo(() => {
  return topCompetitors.map(c => c.name);
}, [topCompetitors]);


const competitorsToShow = useMemo(() => {

  // No Top filter applied
  if (!topMetric) {
    return selectedCompetitors;
  }

  // Top filter active
  return topCompetitorNames;

}, [topMetric, selectedCompetitors, topCompetitorNames]);


// College CR Calculation helper
  const calculateCR = (apps = 0, leads = 0) => {
  return ((apps + leads) / 100).toFixed(2);
};

const mainCollegeCR = useMemo(() => {
  if (!totals) return 0;
  return calculateCR(
    totals.mainCollege.apps,
    totals.mainCollege.leads
  );
}, [totals]);

const competitorCR = useMemo(() => {
  if (!totals) return {};

  const result = {};

  competitorsToShow.forEach(comp => {
    const data = totals.competitors?.[comp] || {};
    result[comp] = calculateCR(
      data.apps || 0,
      data.leads || 0
    );
  });

  return result;
}, [totals, competitorsToShow]);


// Colors for numbers
const getCRColor = (cr) => {
  if (cr > 10) return "text-green-600";
  if (cr > 5) return "text-yellow-600";
  return "text-red-600";
};



return (
  <>
    {/* Basic Information Card */}
    <SectionPermissionWrapper 
      section={CLIENT_SECTIONS.BASIC_INFO} 
      canView={canAccess(CLIENT_SECTIONS.BASIC_INFO, 'view')} 
      canEdit={canEdit(CLIENT_SECTIONS.BASIC_INFO)}
      title="Basic Information"
    >
    <div className="bg-white rounded-3xl shadow-xl sm:p-8 p-3 border-2 border-blue-100">
      <div className="flex items-center space-x-3 mb-6">
        <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
        <h2 className="sm:text-2xl text-lg font-bold text-gray-800">Basic Information</h2>
      </div>

      <div className="space-y-6">
        {/* Status */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Status
          </label>
          <div className="flex flex-wrap gap-3">
            {statusOptions.map(status => (
              <button
                key={status.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, status: status.value }))}
                className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all border-2 ${
                  formData.status === status.value
                    ? `${status.bgColor} ${status.textColor} ${status.borderColor} ring-4 ring-${status.color}-100`
                    : `bg-white text-gray-600 border-gray-200 ${status.hoverBorder}`
                }`}
              >
                {status.value}
              </button>
            ))}
          </div>
        </div>

        {/* Conditional Status Fields */}
        <div className="mt-4 space-y-4">
          {/* Pending Reason (if status is Pending) */}
          {formData.status === 'Pending' && (
            <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Pending Reason
            </label>
            <select
              name="pendingReason"
              value={formData.pendingReason || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
            >
              <option value="">Select reason</option>
              <option value="Details still pending to fill">Details still pending to fill</option>
              <option value="Ops Onboarding">Ops Onboarding</option>
              <option value="API Integration">API Integration</option>
              <option value="Client Payment">Client Payment</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}

        {/* Other Reason Text (if pending reason is Other) */}
        {formData.status === 'Pending' && formData.pendingReason === 'Other' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Specify Other Reason
            </label>
            <textarea
              name="pendingReasonOther"
              value={formData.pendingReasonOther || ''}
              onChange={handleInputChange}
              rows="2"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
              placeholder="Describe the reason..."
            />
          </div>
        )}

        {/* Suspend Reason (if status is Suspended) */}
        {formData.status === 'Suspended' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Suspend Reason
            </label>
            <select
              name="suspendReason"
              value={formData.suspendReason || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
            >
              <option value="">Select reason</option>
              <option value="Payment Overdue">Payment Overdue</option>
              <option value="DLL Issue">DLL Issue</option>
              <option value="Lead Unavailable">Lead Unavailable</option>
              <option value="Lead Quality">Lead Quality</option>
              <option value="Internal Approval">Internal Approval</option>
            </select>
          </div>
        )}

        {/* Inactive Date */}
        {formData.status === 'Inactive' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Inactive Date
            </label>
            <input
              type="date"
              name="inactiveDate"
              value={formData.inactiveDate || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
            />
          </div>
        )}

        {/* Status Reason (general for Inactive, Suspended, Expired) */}
        {(formData.status === 'Inactive' || formData.status === 'Suspended' || formData.status === 'Expired') && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status Reason / Notes
            </label>
            <textarea
              name="statusReason"
              value={formData.statusReason || ''}
              onChange={handleInputChange}
              rows="2"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
              placeholder="Additional details about the status..."
            />
          </div>
        )}

        {/* Active Date */}
        {formData.status === 'Active' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Active Date
            </label>
            <input
              type="date"
              name="activeDate"
              value={formData.activeDate || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
            />
            <p className="text-xs text-gray-500 mt-1">48 hours to fill all details after activation</p>
          </div>
        )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Client Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="clientName"
            value={formData.clientName}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border-2 ${errors.clientName ? 'border-red-300' : 'border-gray-200'} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black`}
            placeholder="Enter client/institution name"
          />
          {errors.clientName && (
            <p className="mt-1 text-sm text-red-600">{errors.clientName}</p>
          )}
        </div>
        {/* Year */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Year
          </label>
          <input
            type="text"
            name="year"
            value={formData.year || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
            placeholder="2025"
          />
        </div>

                      {/* Client Name */}
                      <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Institution Type
          </label>
          <select
            name="institutionType"
            value={formData.institutionType || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all text-black"
          >
            <option value="">Select institution type</option>
            {institutionTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Account Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Account Type
          </label>
          <select
            name="accountType"
            value={formData.accountType || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all text-black"
          >
            <option value="">Select account type</option>
            <option value="Key Account">Key Account</option>
            <option value="Non Key Account">Non Key Account</option>
            <option value="Priority Account">Priority Account</option>
            <option value="New Account">New Account</option>
          </select>
        </div>



        {/* College ID */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            College ID <span className="text-red-500">*</span>
          </label>
          {collegesLoading ? (
            <select
              name="collegeId"
              value={formData.collegeId}
              disabled
              className={`w-full px-4 py-3 border-2 ${errors.collegeId ? 'border-red-300' : 'border-gray-200'} rounded-xl bg-gray-100 text-gray-500`}
            >
              <option value="">Loading colleges...</option>
            </select>
          ) : colleges.length ? (
            <div className="relative">
              <input
                type="text"
                list="colleges-list"
                value={collegeSearchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setCollegeSearchTerm(value);
                  if (value === '') {
                    setFormData(prev => ({
                      ...prev,
                      collegeId: '',
                      collegeCwId: '',
                      city: '',
                      state: '',
                      address: ''
                    }));
                    setSelectedStateId('');
                    setSelectedCityId('');
                    return;
                  }
                  // ...existing code...
                  // Try to find exact match by CW ID or college ID
                  const idMatch = value.match(/\(ID:\s*([^)]+)\)/);
                  const extractedId = idMatch ? idMatch[1].trim() : null;
                  const matchedCollege = colleges.find(c => {
                    if (String(c.cwId) === value || String(c.collegeId) === value) return true;
                    if (extractedId && (String(c.cwId) === extractedId || String(c.collegeId) === extractedId)) return true;
                    if (value.startsWith(`(ID: ${c.cwId || c.collegeId}) ${c.name}`)) return true;
                    return false;
                  });
                  if (matchedCollege) {
                    // ...existing code for matchedCollege...
                    let collegeCity = matchedCollege.city || '';
                    const collegeState = matchedCollege.stateName || matchedCollege.state || '';
                    const collegeCityId = matchedCollege.cityId || '';
                    const collegeCityStateId = matchedCollege.cityStateId || '';
                    const collegeAddress = matchedCollege.address || '';
                    let stateIdToSet = '';
                    if (collegeCityStateId && locationOptions.states.length > 0) {
                      const matchedState = locationOptions.states.find(state => String(state.id) === String(collegeCityStateId));
                      if (matchedState) stateIdToSet = String(matchedState.id);
                    } else if (collegeState && locationOptions.states.length > 0) {
                      const matchedState = locationOptions.states.find(state => state.name?.toLowerCase() === collegeState.toLowerCase());
                      if (matchedState) stateIdToSet = String(matchedState.id);
                    }
                    const availableCities = stateIdToSet ? locationOptions.cities.filter(city => String(city.stateId) === stateIdToSet) : locationOptions.cities;
                    let cityIdToSet = '';
                    if (collegeCityId && availableCities.length > 0) {
                      const matchedCity = availableCities.find(city => String(city.id) === String(collegeCityId));
                      if (matchedCity) {
                        cityIdToSet = String(matchedCity.id);
                        collegeCity = matchedCity.name || collegeCity;
                      }
                    }
                    if (!cityIdToSet && collegeCity && availableCities.length > 0) {
                      const matchedCity = availableCities.find(city => city.name?.toLowerCase() === collegeCity.toLowerCase());
                      if (matchedCity) cityIdToSet = String(matchedCity.id);
                    }
                    setFormData(prev => ({
                      ...prev,
                      collegeId: String(matchedCollege.collegeId),
                      collegeCwId: matchedCollege.cwId || '',
                      city: collegeCity,
                      state: collegeState,
                      address: collegeAddress
                    }));
                    if (stateIdToSet) setSelectedStateId(stateIdToSet);
                    if (cityIdToSet) setSelectedCityId(cityIdToSet);
                    // Replace top cities and states with the selected college's city/state only
                    setSelectedTopCities(collegeCity ? [collegeCity] : []);
                    setSelectedTopStates(collegeState ? [collegeState] : []);
                    if (errors.collegeId) setErrors(prev => ({ ...prev, collegeId: '' }));
                  }
                }}
                onBlur={() => {
                if (!collegeSearchTerm) {
                    setFormData(prev => ({
                      ...prev,
                      collegeId: '',
                      collegeCwId: '',
                      city: '',
                      state: '',
                      address: ''
                    }));
                    setSelectedStateId('');
                    setSelectedCityId('');
                    return;
                  }
                  if (formData.collegeId) {
                    // Find college by cwId first, then fall back to collegeId
                    const selectedCollege = colleges.find(c => 
                      String(c.cwId) === formData.collegeId || 
                      String(c.collegeId) === formData.collegeId
                    );
                    if (selectedCollege) {
                      const cwId = selectedCollege.cwId || selectedCollege.collegeId;
                      setCollegeSearchTerm(`(ID: ${cwId}) ${selectedCollege.name}`);
                    }
                  }
                }}
                className={`w-full px-4 py-3 border-2 ${errors.collegeId ? 'border-red-300' : 'border-gray-200'} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black`}
                placeholder="Search by CW ID or college name..."
                autoComplete="off"
              />
              <datalist id="colleges-list">
                {colleges
                  .filter(college => {
                    if (!collegeSearchTerm) return true;
                    const searchLower = collegeSearchTerm.toLowerCase();
                    const cwId = String(college.cwId || '').toLowerCase();
                    const name = (college.name || '').toLowerCase();
                    const city = (college.city || '').toLowerCase();
                    const state = (college.state || '').toLowerCase();
                    return cwId.includes(searchLower) || 
                            name.includes(searchLower) || 
                            city.includes(searchLower) || 
                            state.includes(searchLower);
                  })
                  .map((college) => {
                    const locationParts = [college.city, college.state].filter(Boolean);
                    const location = locationParts.length ? `, ${locationParts.join(', ')}` : '';
                    const cwId = college.cwId || college.collegeId;
                    return (
                      <option 
                        key={college.collegeId} 
                        value={`(ID: ${cwId}) ${college.name}${location}`}
                        data-value={college.collegeId}
                      />
                    );
                  })}
              </datalist>
            </div>
          ) : (
            <input
              type="text"
              name="collegeId"
              value={formData.collegeId}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border-2 ${errors.collegeId ? 'border-red-300' : 'border-gray-200'} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black`}
              placeholder="Enter college ID manually"
            />
          )}
          {collegesError && (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm text-red-600">{collegesError}</p>
              <button
                type="button"
                onClick={loadColleges}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Retry
              </button>
            </div>
          )}
          {errors.collegeId && (
            <p className="mt-1 text-sm text-red-600">{errors.collegeId}</p>
          )}
        </div>
        {/* Expiry Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Expiry Date <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate || ''}
              onChange={handleInputChange}
              min={isEditMode ? undefined : new Date().toISOString().split('T')[0]}
              required
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
            />
          </div>
          {errors.expiryDate && (
            <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Set when client access should expire</p>
        </div>


                      {/* <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Client LP Page Link
          </label>
          <input
            type="text"
            name="Lp Page Link"
            value={formData.collegeId}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
            placeholder="Client lp page"
          />
        </div> */}
      </div>
      </div>
    </div>
    </SectionPermissionWrapper>

    {/* Application Form */}
    <SectionPermissionWrapper
    section={CLIENT_SECTIONS.APPLICATION_FORM}
    canView={canAccess(CLIENT_SECTIONS.APPLICATION_FORM, 'view')} 
    canEdit={canEdit(CLIENT_SECTIONS.APPLICATION_FORM)}
    title="Application Form">
      <div className="bg-white mt-3 rounded-3xl shadow-xl sm:p-8 p-3 border-2 border-purple-100">
          <div className="flex items-center space-x-3 mb-6">
        <DocumentTextIcon className="w-6 h-6 text-green-600" />
        <h2 className="sm:text-2xl text-lg font-bold text-gray-800">Application Form</h2>
      </div>
        

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Starting Date */}
          <div>
            <label className="flex-1 block text-sm font-semibold text-gray-700 mb-2">
              Start Date
            </label>
            <div className="relative">
              <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="date"
                name="applicationFormStartDate"
                value={formatDateForInput(formData.applicationFormStartDate || '')}
                onChange={handleInputChange}
                min={isEditMode ? undefined : new Date().toISOString().split('T')[0]}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
              />
            </div>
            {errors.applicationFormStartDate && (
              <p className="mt-1 text-sm text-red-600">{errors.applicationFormStartDate}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Set start Date</p>
          </div>
          {/* End Date */}
          <div>
            <label className="flex-1 block text-sm font-semibold text-gray-700 mb-2">
              End Date 
            </label>
            <div className="relative">
              <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="date"
                name="applicationFormEndDate"
                value={formatDateForInput(formData.applicationFormEndDate || '')}
                onChange={handleInputChange}
                min={isEditMode ? undefined : new Date().toISOString().split('T')[0]}
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
              />
            </div>
            {errors.applicationFormEndDate && (
              <p className="mt-1 text-sm text-red-600">{errors.applicationFormEndDate}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Set end Date</p>
          </div>
        </div>

        {/* utm Link */}
              <div className="utm-link mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  UTM Link / URL
                </label>
                <input
                  type="url"  
                  name="applicationFormUtmLink"
                  value={formData.applicationFormUtmLink || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
                  placeholder="https://utm.example.com"
                />
              </div>

              
        {/* {Courses } */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Courses Offered
          </label>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={applicationCourseSearch}
                  onChange={handleApplicationCourseSearchChange}
                  onKeyDown={handleApplicationCourseSearchKeyDown}
                  className="w-full rounded-xl border-2 border-green-100 bg-white px-4 py-3 pr-12 text-sm text-black shadow-sm focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                  placeholder="Search or add courses"
                />
                {applicationCourseSearch ? (
                  <button
                    type="button"
                    onClick={() => setApplicationCourseSearch('')}
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-green-100 text-green-600 transition hover:bg-green-200"
                    aria-label="Clear search"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleAddApplicationCourseFromSearch}
                disabled={!applicationCourseSearch.trim()}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-green-200 ${
                  applicationCourseSearch.trim()
                    ? 'bg-gradient-to-r from-green-500 to-indigo-600 text-white shadow-lg hover:from-green-600 hover:to-indigo-700'
                    : 'cursor-not-allowed bg-gray-100 text-gray-400'
                }`}
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Applications</span>
              </button>
            </div>

            {Array.isArray(applicationCourses) && applicationCourses.length ? (
              <div className="flex flex-wrap gap-2">
                {applicationCourses.map((courseName) => {
                  const trimmedName = courseName?.toString().trim();
                  if (!trimmedName) {
                    return null;
                  }
                  const key = `app-selected-${trimmedName.toLowerCase()}`;
                  return (
                    <span
                      key={key}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                    >
                      <span className="max-w-[180px] truncate">{trimmedName}</span>
                      <button
                        type="button"
                        onClick={() => handleApplicationCourseToggle(trimmedName)}
                        className="rounded-full bg-white/20 p-1 text-white/80 transition hover:bg-white/30 hover:text-white"
                        aria-label={`Remove ${trimmedName}`}
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-5">
                No Application selected yet. Use the search above or pick from the dropdown catalogue below.
              </p>
            )}
                

            {(courseLevels.length > 0 || uncategorizedCourseCount > 0) && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-green-100 bg-green-50/60 p-3 mb-4">
                {courseLevels.map((level) => {
                  const id = String(level.id);
                  const isActive = selectedCourseLevelIds.includes(id);
                  const courseCount =
                    level.courseCount ?? level.totalCourses ?? level.count ?? level.total ?? '';
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleCourseLevelToggle(id)}
                      className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-green-500 to-indigo-600 text-white shadow-md'
                          : 'border border-green-200 bg-white text-green-700 hover:border-green-300 hover:bg-green-100'
                      }`}
                    >
                      <span>{level.name || `Level ${id}`}</span>
                      {courseCount ? (
                        <span className={isActive ? 'text-[10px] text-green-100' : 'text-[10px] text-green-500'}>
                          {courseCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {uncategorizedCourseCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleCourseLevelToggle('unassigned')}
                    className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                      selectedCourseLevelIds.includes('unassigned')
                        ? 'bg-gradient-to-r from-green-500 to-indigo-600 text-white shadow-md'
                        : 'border border-green-200 bg-white text-green-700 hover:border-green-300 hover:bg-green-100'
                    }`}
                    >
                    <span>Other Programs</span>
                    <span
                      className={
                        selectedCourseLevelIds.includes('unassigned')
                          ? 'text-[10px] text-green-100'
                          : 'text-[10px] text-green-500'
                      }
                    >
                      {uncategorizedCourseCount}
                    </span>
                  </button>
                )}
                {selectedCourseLevelIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCourseFilters}
                    className="ml-auto text-xs font-semibold text-green-600 underline decoration-dotted underline-offset-2 hover:text-green-800"
                  >
                    Clear filters
                  </button>
                )}
                {/* {Dropdown Toggle Button} */}
                <button
                  type="button"
                  onClick={handleToggleCourseDropdown}
                  className="ml-auto flex items-center gap-2 rounded-full px-3 py-1 border border-green-200 bg-white text-green-700 hover:border-green-300 hover:bg-green-100 transition-all"
                  aria-label={isCourseDropdownOpen ? "Close course catalogue" : "Open course catalogue"}
                >
                  <span className="text-xs font-semibold">
                    {isCourseDropdownOpen ? 'Hide Courses' : 'Show Courses'}
                  </span>
                  {isCourseDropdownOpen ? (
                    <XMarkIcon className="cross w-5 h-5" ></XMarkIcon>
                  ) : (
                    <ChevronDownIcon className="down w-5 h-5"></ChevronDownIcon>
                  )}
                </button>
              </div>
            )}

            {coursesError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {coursesError}
              </div>
            ) : null}

            {coursesNotice && !coursesError ? (
              <div className="rounded-2xl border border-green-100 bg-green-50 p-3 text-xs font-semibold text-green-700">
                {coursesNotice}
              </div>
            ) : null}

            {/* Course Catalogue Dropdown - Only show when open */}
            {isCourseDropdownOpen && (
              <div className="max-h-80 space-y-4 overflow-y-auto pr-1 mb-5">
                {!formData.collegeId ? (
                  <p className="text-sm text-gray-500">Select a college to load its course catalogue.</p>
                ) : coursesLoading ? (
                  <p className="text-sm text-gray-500">Loading courses...</p>
                ) : coursesError ? (
                  <p className="text-sm text-gray-500">Unable to display courses. Adjust filters or retry after fixing the issue above.</p>
                ) : filteredApplicationGroupedCourses.length ? (
                  filteredApplicationGroupedCourses.map((group, groupIndex) => {
                    const groupKey = group.levelId || group.levelName || `group-${groupIndex}`;
                    return (
                      <div key={groupKey} className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-green-700">{group.levelName}</p>
                            {group.levelDescription ? (
                              <p className="text-xs text-green-500">{group.levelDescription}</p>
                            ) : null}
                          </div>
                          <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-600">
                            {group.courses.length} {group.courses.length === 1 ? 'course' : 'courses'}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {group.courses.map((course) => {
                            const label = course?.name?.trim();
                            if (!label) {
                              return null;
                            }
                            const normalized = label.toLowerCase();
                            const isSelected = selectedApplicationCourseSet.has(normalized);
                            const key = course.id ? `app-course-${course.id}` : `app-course-${normalized}`;
                            const durationLabel = course.duration ? `${course.duration} months` : '';
                            return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleApplicationCourseToggle(label)}
                              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all ${
                                isSelected
                                  ? 'border-green-500 bg-gradient-to-r from-green-500 to-indigo-600 text-white shadow-lg'
                                  : 'border-green-100 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50'
                              }`}
                            >
                              <div className="flex-1">
                                <p className="truncate">{label}</p>
                                {durationLabel ? (
                                  <p className={isSelected ? 'text-xs text-green-100' : 'text-xs text-green-500'}>
                                    {durationLabel}
                                  </p>
                                ) : null}
                              </div>
                              {isSelected ? (
                                <CheckIcon className="h-4 w-4 flex-shrink-0 text-white" />
                              ) : (
                                <PlusIcon className="h-4 w-4 flex-shrink-0 text-green-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
                ) : applicationCourseSearch.trim() ? (
                  <p className="text-sm text-gray-500">No courses match "{applicationCourseSearch}". Try a different search term or add it manually above.</p>
              ) : courseOptions.length ? (
                <p className="text-sm text-gray-500">No courses match your search or filters. Adjust the filters above or add a custom course.</p>
              ) : (
                <p className="text-sm text-gray-500">No catalogued courses available. You can still add courses manually.</p>
              )}
            </div>
            )}
          </div>
          {errors.courses && (
            <p className="mt-1 text-sm text-red-600">{errors.courses}</p>
          )}
        </div>

        {/* Application Details */}
        <div className="text-sm font-semibold text-gray-700 mb-2">
          Application Details
        </div>
        {details.map((value, index) => (
          <div key={index} className="relative application-details mb-6">
            <input
              type="text"
              value={value}
              maxLength={maxLength}
              onChange={(e) => {
                const value = e.target.value;

                const fieldNames = [
                  "applicationFormDetail1",
                  "applicationFormDetail2",
                  "applicationFormDetail3"
                ];

                const fieldName = fieldNames[index];

                setFormData((prev) => ({
                  ...prev,
                  [fieldName]: value
                }));

                if (value.length === maxLength) {
                  setActiveToastIndex(index);

                  setTimeout(() => {
                    setActiveToastIndex(null);
                  }, 2500);
                }
              }}
              onBlur={() => setActiveToastIndex(null)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black "
              placeholder="Enter detail (max 29 characters)"
            />

            {/* counter */}
            <span className="text-xs text-gray-700">
              {value.length}/{maxLength}
            </span>

            {/* Floating Notification */}
            {activeToastIndex === index && (
              <div className="absolute left-2 -bottom-6 bg-yellow-400 text-black text-xs px-3 py-1 rounded-lg shadow-lg animate-fade-in ">
                Max 31 characters reached
              </div>
            )}
          </div>
        ))}

        
      </div>
    </SectionPermissionWrapper>

    {/* Client Details Section */}
    <SectionPermissionWrapper 
      section={CLIENT_SECTIONS.CLIENT_DETAILS} 
      canView={canAccess(CLIENT_SECTIONS.CLIENT_DETAILS, 'view')} 
      canEdit={canEdit(CLIENT_SECTIONS.CLIENT_DETAILS)}
      title="Client Details"
    >
    <div className="bg-white mt-3 rounded-3xl shadow-xl sm:p-8 p-3 border-2 border-purple-100">
        <div className="flex items-center space-x-3 mb-6">
          <DocumentTextIcon className="w-6 h-6 text-purple-600" />
          <h2 className="sm:text-2xl text-lg font-bold text-gray-800">Client Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <EnvelopeIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full pl-11 pr-4 py-3 border-2 ${errors.email ? 'border-red-300' : 'border-gray-200'} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black`}
              placeholder="client@example.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

                      {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <PhoneIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`w-full pl-11 pr-4 py-3 border-2 ${errors.phone ? 'border-red-300' : 'border-gray-200'} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black`}
              placeholder="10-digit phone number"
            />
          </div>
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

                      {/* Additional Emails */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Additional Email Addresses
          </label>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <EnvelopeIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (errors.emailInput) {
                    setErrors(prev => ({ ...prev, emailInput: '' }));
                  }
                }}
                onKeyPress={handleEmailInputKeyPress}
                className={`w-full pl-11 pr-4 py-3 border-2 ${errors.emailInput ? 'border-red-300' : 'border-gray-200'} rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black`}
                placeholder="additional@example.com"
              />
            </div>
            <button
              type="button"
              onClick={handleAddEmail}
              className="sm:px-6 sm:py-3 px-2 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center sm:space-x-2 space-x-1"
            >
              <PlusIcon className="sm:w-5 sm:h-5 w-3 h-3" />
              <span>Add</span>
            </button>
          </div>
          {errors.emailInput && (
            <p className="text-sm text-red-600 mb-2">{errors.emailInput}</p>
          )}
          {formData.additionalEmails.length > 0 && (
            <div className="space-y-2">
              {formData.additionalEmails.map((email, index) => (
                <div key={`email-${email}-${index}`} className="flex items-center justify-between bg-blue-50 border-2 border-blue-200 rounded-xl px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(index)}
                    className="text-red-500 hover:text-red-700 transition-colors p-1"
                    title="Remove email"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">Add multiple email addresses for notifications and communications</p>
        </div>



        {/* Alternate Phone */}
        <div>

          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Alternate Phone
          </label>
          <div className="relative">
            <PhoneIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="tel"
              name="alternatePhone"
              value={formData.alternatePhone}
              onChange={handleInputChange}
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
              placeholder="Optional"
            />
          </div>
        </div>



{/* <div className="mb-2"> */}
        {/* Address */}
        <div className="">
          <label className="block text-sm font-semibold text-gray-700 ">
            Address
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            rows="3"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
            placeholder="Enter complete address"
          />
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            State <span className="text-red-500">*</span>
          </label>
          {locationLoading ? (
            <select
              name="state"
              value=""
              disabled
              className={`w-full px-4 py-3 border-2 ${errors.state ? 'border-red-300' : 'border-gray-200'} rounded-xl bg-gray-100 text-gray-500`}
            >
              <option value="">Loading states...</option>
            </select>
          ) : (locationOptions.states.length > 0) ? (
            <select
              name="state"
              value={selectedStateId}
              onChange={handleStateSelect}
              onFocus={() => setShowAllStates(true)}
              onClick={() => setShowAllStates(true)}
              className={`w-full px-4 py-3 border-2 ${errors.state ? 'border-red-300' : 'border-gray-200'} rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black`}
            >
              <option value="">Select state</option>
              {stateOptionsToRender.map((state) => (
                <option key={state.id} value={String(state.id)}>
                  {state.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border-2 ${errors.state ? 'border-red-300' : 'border-gray-200'} rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black`}
              placeholder="Enter state"
            />
          )}
          {errors.state && (
            <p className="mt-1 text-sm text-red-600">{errors.state}</p>
          )}
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            City <span className="text-red-500">*</span>
          </label>
          {locationLoading ? (
            <select
              name="city"
              value=""
              disabled
              className={`w-full px-4 py-3 border-2 ${errors.city ? 'border-red-300' : 'border-gray-200'} rounded-xl bg-gray-100 text-gray-500`}
            >
              <option value="">Loading cities...</option>
            </select>
          ) : citiesLoading ? (
            <select
              name="city"
              value=""
              disabled
              className={`w-full px-4 py-3 border-2 ${errors.city ? 'border-red-300' : 'border-gray-200'} rounded-xl bg-gray-100 text-gray-500`}
            >
              <option value="">Loading cities...</option>
            </select>
          ) : (selectedStateId ? filteredCities?.length > 0 : locationOptions?.cities?.length > 0) ? (
            <select
              name="city"
              value={selectedCityId}
              onChange={handleCitySelect}
              disabled={!selectedStateId}
              className={`w-full px-4 py-3 border-2 ${errors.city ? 'border-red-300' : 'border-gray-200'} rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black ${!selectedStateId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">{selectedStateId ? 'Select city' : 'Select state first'}</option>
              {cityOptionsToRender.map((city) => (
                <option key={city.id} value={String(city.id)}>
                  {city.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border-2 ${errors.city ? 'border-red-300' : 'border-gray-200'} rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black`}
              placeholder="Enter city"
            />
          )}
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Country
          </label>
          <div className="relative">
            <GlobeAltIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
              placeholder="Country"
            />
          </div>
        </div>

        {/* Pincode */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pincode
          </label>
          <input
            type="text"
            name="pincode"
            value={formData.pincode}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
            placeholder="6-digit pincode"
            maxLength="6"
          />
        </div>


      {/* </div> */}


        </div>
      </div>
    </SectionPermissionWrapper>

    {/* Priority Locations & Competitors Section */}
    <SectionPermissionWrapper 
      section={CLIENT_SECTIONS.TOP_COMPETITORS} 
      canView={canAccess(CLIENT_SECTIONS.TOP_COMPETITORS, 'view')} 
      canEdit={canEdit(CLIENT_SECTIONS.TOP_COMPETITORS)}
      title="Priority Locations & Competitors"
    >
    <div className="bg-white mt-3 rounded-3xl shadow-xl sm:p-8 p-3 border-2 border-indigo-100">
      <div className="flex items-center space-x-3 mb-6 mt-2">
        <MapPinIcon className="w-6 h-6 text-indigo-600" />
        <h2 className="sm:text-2xl text-lg font-bold text-gray-800">Priority Locations & Competitors</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Priority States */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <GlobeAltIcon className="w-5 h-5 inline-block mr-2 text-green-500" />
            Top Priority States
          </label>
          <p className="text-xs text-gray-500 mb-3">Add states to prioritize for lead filtering</p>
          <div className="space-y-3">
            {locationLoading ? (
              <select
                disabled
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-500"
              >
                <option value="">Loading states...</option>
              </select>
            ) : locationOptions.states.length > 0 ? (
              <div className="flex items-center gap-2">
                <select
                  id="topStateSelect"
                  className="flex-1 min-w-0 sm:px-4 px-1 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
                  defaultValue=""
                >
                  <option value="">Search and select state...</option>
                  {locationOptions.states
                    .filter(state => !selectedTopStates.includes(state.name))
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map((state) => (
                      <option key={state.id} value={state.name}>
                        {state.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const select = document.getElementById('topStateSelect');
                    const state = select ? select.value : '';
                    if (state && !selectedTopStates.includes(state)) {
                      setSelectedTopStates(prev => [...prev, state]);
                      if (select) select.value = '';
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  id="topStateInput"
                  placeholder="Enter state name (e.g., Rajasthan)"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const state = e.target.value.trim();
                      if (state && !selectedTopStates.includes(state)) {
                        setSelectedTopStates(prev => [...prev, state]);
                        e.target.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('topStateInput');
                    const state = input ? input.value.trim() : '';
                    if (state && !selectedTopStates.includes(state)) {
                      setSelectedTopStates(prev => [...prev, state]);
                      if (input) input.value = '';
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add
                </button>
              </div>
            )}
            {selectedTopStates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTopStates.map((state, index) => (
                  <span
                    key={`top-state-${state.id || state.name}-${index}`}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium shadow-md"
                  >
                    {state}
                    <button
                      type="button"
                      onClick={() => setSelectedTopStates(prev => prev.filter(s => s !== state))}
                      className="rounded-full bg-white/20 p-1 hover:bg-white/30 transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Priority Cities */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <MapPinIcon className="w-5 h-5 inline-block mr-2 text-blue-500" />
            Top Priority Cities
          </label>
          <p className="text-xs text-gray-500 mb-3">Add cities to prioritize for lead filtering</p>
          <div className="space-y-3">
            {selectedTopStates.length > 0 ? (
              <div className="space-y-2">
                {/* Search Input */}
                <input
                  type="text"
                  value={priorityCitySearchTerm}
                  onChange={(e) => setPriorityCitySearchTerm(e.target.value)}
                  placeholder="Search cities in selected states..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
                />
                {/* City Selection Dropdown */}
                <div className="flex gap-2">
                  <select
                    id="topCitySelect"
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-black"
                    defaultValue=""
                    disabled={priorityCitiesLoading}
                  >
                    <option value="">
                      {priorityCitiesLoading 
                        ? 'Loading cities...' 
                        : filteredPriorityCitiesFromApi.length > 0
                          ? 'Select city from results...'
                          : 'No cities found'}
                    </option>
                    {filteredPriorityCitiesFromApi
                      .filter(city => !selectedTopCities.includes(city.name))
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map((city) => (
                        <option key={city.id} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const select = document.getElementById('topCitySelect');
                      const city = select ? select.value : '';
                      if (city && !selectedTopCities.includes(city)) {
                        setSelectedTopCities(prev => [...prev, city]);
                        if (select) select.value = '';
                      }
                    }}
                    disabled={priorityCitiesLoading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="sm:p-4 p-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-center">
                <p className="text-sm text-gray-600">
                  <MapPinIcon className="w-5 h-5 inline-block mr-2 text-gray-400" />
                  Please select one or more <strong>Top Priority States</strong> first to see available cities.
                </p>
              </div>
            )}
            {selectedTopCities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTopCities.map((city, index) => (
                  <span
                    key={`top-city-${city.id || city.name}-${index}`}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium shadow-md"
                  >
                    {city}
                    <button
                      type="button"
                      onClick={() => setSelectedTopCities(prev => prev.filter(c => c !== city))}
                      className="rounded-full bg-white/20 p-1 hover:bg-white/30 transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Competitors */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <BuildingOffice2Icon className="w-5 h-5 inline-block mr-2 text-purple-500" />
            Top Competitors
          </label>
          <p className="text-xs text-gray-500 mb-3">Add competitor institutions</p> <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                list="competitors-list"
                id="competitorInput"
                placeholder="Search and enter competitor name"
                className="flex-1 px-4 sm:py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all text-black"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const competitor = e.target.value.trim();
                    if (competitor && !(formData.topCompetitors || []).includes(competitor)) {
                      setFormData(prev => ({ ...prev, topCompetitors: [...(prev.topCompetitors || []), competitor] }));
                      e.target.value = '';
                    }
                  }
                }}
              />
              <datalist id="competitors-list">
                {colleges.map((college, index) => (
                  <option key={`${college.id}-${index}`} value={college.name}>
                    {college.name}
                  </option>
                ))}
              </datalist>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('competitorInput');
                  const competitor = input ? input.value.trim() : '';
                  if (competitor && !(formData.topCompetitors || []).includes(competitor)) {
                    setFormData(prev => ({ ...prev, topCompetitors: [...(prev.topCompetitors || []), competitor] }));
                    if (input) input.value = '';
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Add
              </button>
            </div>
            {Array.isArray(formData.topCompetitors) && formData.topCompetitors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.topCompetitors.map((competitor, index) => (
                  <span
                    key={`competitor-${competitor}-${index}`}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-medium shadow-md"
                  >
                    {competitor}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, topCompetitors: (prev.topCompetitors || []).filter(c => c !== competitor) }));
                      }}
                      className="rounded-full bg-white/20 p-1 hover:bg-white/30 transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </SectionPermissionWrapper>

    {/* Campaign Details Section - Part of basicInfo */}
    <SectionPermissionWrapper 
      section={CLIENT_SECTIONS.BASIC_INFO} 
      canView={canAccess(CLIENT_SECTIONS.BASIC_INFO, 'view')} 
      canEdit={canEdit(CLIENT_SECTIONS.BASIC_INFO)}
      title="Campaign Details"
    >
    <div className="bg-white mt-3 rounded-3xl shadow-xl sm:p-8 p-3 border-2 border-green-100">
      <div className='head-conatiner flex justify-between'>
        <div className="flex items-center justify-center space-x-3 mb-6">
          <ChartBarIcon className="w-6 h-6 text-green-600" />
          <h2 className="sm:text-2xl text-lg font-bold text-gray-800">Campaign Details</h2>
        </div>
                                
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Branding Toggle */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Branding
              </label>
              <p className="text-xs text-gray-500">Enable branding for this client</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, branding: !prev.branding }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                formData.branding ? 'bg-green-600' : 'bg-gray-400'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.branding ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Branding Details - Show when enabled */}
          {formData.branding && (
            <div className="mt-4 grid grid-cols-1 justify-end md:grid-cols-3 gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Impressions
                </label>
                <input
                  type="number"
                    name="brandingBudget"
                    value={formData.brandingBudget ?? ''}
                    onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-black"
                  placeholder="e.g., 50000"
                  min="0"
                />
              </div>
                                  <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Impressions Delivered
                  </label>
                <input
                  type="number"
                    name="brandingDelivery"
                    value={formData.brandingDelivery ?? ''}
                    onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-black"
                  placeholder="e.g., 50000"
                  min="0"
                />
              </div>
                                  <div className="md:col-span-3 space-y-3 mt-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">Upload Branding Files</label>
                    <p className="sm:text-xs text-xs text-gray-500">
                      Upload files related to branding campaign
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={brandingFileInputRef}
                      onChange={handleBrandingFileUpload}
                      accept=".xlsx,.xls,.pdf,.csv,.doc,.docx,.txt,.ppt,.pptx,.xlsm,.xlsb,.odt,.ods,.rtf,.jpg,.jpeg,.png"
                      multiple
                      className="hidden"
                      id="branding-file-upload"
                    />
                    <label
                      htmlFor="branding-file-upload"
                      className="cursor-pointer px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg flex items-center gap-2 font-semibold"
                    >
                      <ArrowUpTrayIcon className="w-5 h-5" />
                      Upload File(s)
                    </label>
                  </div>
                </div>

                {brandingUploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-600 font-medium text-sm">{brandingUploadError}</p>
                  </div>
                )}

                {brandingFilesToUpload.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-blue-700 font-medium text-sm mb-2">
                      ✓ {brandingFilesToUpload.length} file(s) ready to upload
                    </p>
                    <div className="space-y-2">
                      {brandingFilesToUpload.map((item) => (
                        <div key={item.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs text-gray-700 truncate">{item.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.file) {
                                  const url = URL.createObjectURL(item.file);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = item.fileName;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Download"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveBrandingFile(item.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Remove"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Display Saved Branding Files */}
                {savedBrandingFiles.length > 0 && (
                  <div className="bg-white border border-green-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-700 mb-3">
                      Saved Files ({savedBrandingFiles.length}) - <span className="text-green-600">Stored on server</span>
                    </p>
                    <div className="space-y-2">
                      {savedBrandingFiles.map((file, index) => (
                        <div key={`branding-${file.id || index}-${file.fileName || file.originalName}`} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs text-gray-700 truncate">{file.originalName || file.fileName}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <button
                              type="button"
                              onClick={() => handleDownloadBrandingFile(file.id || index, file.originalName || file.fileName)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Download"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedBrandingFile(file.id || index)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {brandingFilesToUpload.length === 0 && savedBrandingFiles.length === 0 && (
                  <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                    <p className="sm:text-sm text-xs text-gray-600">Uploaded files will show here.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Expected Leads */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Expected Leads
          </label>
          <input
            type="number"
            name="expectedLeads"
            value={formData.expectedLeads ?? ''}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
            placeholder="e.g., 1000"
            min="0"
          />
        </div>

        {/* Leads Delivered */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Leads Delivered
          </label>
          <input
            type="number"
            name="leadsDelivered"
            value={formData.leadsDelivered ?? ''}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
            placeholder="e.g., 800"
            min="0"
          />
        </div>

        {/* Target Application */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Target Application
          </label>
          <input
            type="number"
            name="targetApplication"
            value={formData.targetApplication ?? ''}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
            placeholder="e.g., 500"
            min="0"
          />
        </div>

        {/* Application Delivered */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Application Delivered
          </label>
          <input
            type="number"
            name="targetApplicationDelivered"
            value={formData.targetApplicationDelivered ?? ''}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
            placeholder="e.g., 400"
            min="0"
          />
        </div>

        {/* Target Admission */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Target Admission
          </label>
          <input
            type="number"
            name="targetAdmission"
            value={formData.targetAdmission ?? ''}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
            placeholder="e.g., 200"
            min="0"
          />
        </div>

        {/* Admission Delivered */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Admission Delivered
          </label>
          <input
            type="number"
            name="targetAdmissionDelivered"
            value={formData.targetAdmissionDelivered ?? ''}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
            placeholder="e.g., 150"
            min="0"
          />
        </div>
{/* <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Delivery
                    </label>
                    <input
                      type="number"
                      name="delivery"
                      value={formData.delivery || ''}
                      onChange={handleInputChange}
                      placeholder="Enter expected number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-black"
                      min="0"
                    />
                  </div> */}

        {/* Communication Channels */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Communication Channels
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Emails */}
            <div className="p-4 bg-white rounded-xl border-2 border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                  <p className="font-semibold text-gray-800">Email</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, emailsEnabled: !prev.emailsEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    formData.emailsEnabled ? 'bg-green-600' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.emailsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {formData.emailsEnabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Expected Delivery
                    </label>
                    <input
                      type="number"
                      name="emailExpectedDelivery"
                      value={formData.emailExpectedDelivery || ''}
                      onChange={handleInputChange}
                      placeholder="Enter expected number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-black"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Delivery (Auto-calculated)
                    </label>
                    <input
                      type="number"
                      name="emailDelivery"
                      value={formData.emailDelivery || ''}
                      onChange={handleInputChange}
                      placeholder="Auto-calculated from daily"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-black bg-gray-50"
                      min="0"
                      readOnly
                    />
                    {formData.emailDelivery && formData.emailExpectedDelivery && parseInt(formData.emailDelivery) > parseInt(formData.emailExpectedDelivery) && (
                      <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Warning: Delivery ({formData.emailDelivery}) exceeds expected delivery ({formData.emailExpectedDelivery})
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Open Rate %
                      </label>
                      <input
                        type="number"
                        name="emailOpenRate"
                        value={formData.emailOpenRate || ''}
                        onChange={handleInputChange}
                        placeholder="e.g., 25"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-black"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        CR %
                      </label>
                      <input
                        type="number"
                        name="emailCR"
                        value={formData.emailCR || ''}
                        onChange={handleInputChange}
                        placeholder="e.g., 5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-black"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleOpenDailyDeliveryModal('email')}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      + Add Daily Delivery
                    </button>
                    {formData.emailDailyDeliveries && formData.emailDailyDeliveries.length > 0 && (
                      <div className="mt-2 max-h-32 text-black overflow-y-auto space-y-1">
                        {formData.emailDailyDeliveries.map((delivery, idx) => (
                          <div key={idx} className="flex justify-between items-center text-black text-xs bg-gray-50 px-2 py-1 rounded">
                            <span>{new Date(delivery.date).toLocaleDateString()}: {delivery.amount}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDailyDelivery('email', delivery.date)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="p-4 bg-white rounded-xl border-2 border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="font-semibold text-gray-800">Message</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, messageEnabled: !prev.messageEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    formData.messageEnabled ? 'bg-green-600' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.messageEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {formData.messageEnabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Expected Delivery
                    </label>
                    <input
                      type="number"
                      name="messageExpectedDelivery"
                      value={formData.messageExpectedDelivery || ''}
                      onChange={handleInputChange}
                      placeholder="Enter expected number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm text-black"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Delivery (Auto-calculated)
                    </label>
                    <input
                      type="number"
                      name="messageDelivery"
                      value={formData.messageDelivery || ''}
                      onChange={handleInputChange}
                      placeholder="Auto-calculated from daily"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm text-black bg-gray-50"
                      min="0"
                      readOnly
                    />
                    {formData.messageDelivery && formData.messageExpectedDelivery && parseInt(formData.messageDelivery) > parseInt(formData.messageExpectedDelivery) && (
                      <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Warning: Delivery ({formData.messageDelivery}) exceeds expected delivery ({formData.messageExpectedDelivery})
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Open Rate %
                      </label>
                      <input
                        type="number"
                        name="messageOpenRate"
                        value={formData.messageOpenRate || ''}
                        onChange={handleInputChange}
                        placeholder="e.g., 25"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm text-black"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        CR %
                      </label>
                      <input
                        type="number"
                        name="messageCR"
                        value={formData.messageCR || ''}
                        onChange={handleInputChange}
                        placeholder="e.g., 5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm text-black"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleOpenDailyDeliveryModal('message')}
                      className="w-full px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      + Add Daily Delivery
                    </button>
                    {formData.messageDailyDeliveries && formData.messageDailyDeliveries.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                        {formData.messageDailyDeliveries.map((delivery, idx) => (
                          <div key={idx} className="flex justify-between items-center text-black text-xs bg-gray-50 px-2 py-1 rounded">
                            <span>{new Date(delivery.date).toLocaleDateString()}: {delivery.amount}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDailyDelivery('message', delivery.date)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp */}
            <div className="p-4 bg-white rounded-xl border-2 border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <p className="font-semibold text-gray-800">WhatsApp</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, whatsappEnabled: !prev.whatsappEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    formData.whatsappEnabled ? 'bg-green-600' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.whatsappEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {formData.whatsappEnabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Expected Delivery
                    </label>
                    <input
                      type="number"
                      name="whatsappExpectedDelivery"
                      value={formData.whatsappExpectedDelivery || ''}
                      onChange={handleInputChange}
                      placeholder="Enter expected number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-black"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Delivery (Auto-calculated)
                    </label>
                    <input
                      type="number"
                      name="whatsappDelivery"
                      value={formData.whatsappDelivery || ''}
                      onChange={handleInputChange}
                      placeholder="Auto-calculated from daily"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-black bg-gray-50"
                      min="0"
                      readOnly
                    />
                    {formData.whatsappDelivery && formData.whatsappExpectedDelivery && parseInt(formData.whatsappDelivery) > parseInt(formData.whatsappExpectedDelivery) && (
                      <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Warning: Delivery ({formData.whatsappDelivery}) exceeds expected delivery ({formData.whatsappExpectedDelivery})
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Open Rate %
                      </label>
                      <input
                        type="number"
                        name="whatsappOpenRate"
                        value={formData.whatsappOpenRate || ''}
                        onChange={handleInputChange}
                        placeholder="e.g., 25"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-black"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        CR %
                      </label>
                      <input
                        type="number"
                        name="whatsappCR"
                        value={formData.whatsappCR || ''}
                        onChange={handleInputChange}
                        placeholder="e.g., 5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-black"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleOpenDailyDeliveryModal('whatsapp')}
                      className="w-full px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      + Add Daily Delivery
                    </button>
                    {formData.whatsappDailyDeliveries && formData.whatsappDailyDeliveries.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                        {formData.whatsappDailyDeliveries.map((delivery, idx) => (
                          <div key={idx} className="flex justify-between items-center text-black text-xs bg-gray-50 px-2 py-1 rounded">
                            <span>{new Date(delivery.date).toLocaleDateString()}: {delivery.amount}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDailyDelivery('whatsapp', delivery.date)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </SectionPermissionWrapper>

      {/* Competitor Performance (NEW SECTION - only in Edit Mode) */}
        {isEditMode && (
      <SectionPermissionWrapper
        section="competitor_performance"
        canView={true}
        canEdit={true}
        title="Competitor Performance"
      >
      <div className="bg-white mt-3 rounded-3xl shadow-xl sm:p-8 p-3 border-2 border-green-100">
          <div className="flex items-center space-x-3 mb-6">
            <ChartBarIcon className="w-6 h-6 text-green-600" />
            <h2 className="sm:text-2xl text-lg font-bold text-gray-800">
              Competitor Performance
            </h2>
            <button  
              // onClick = {Savebtn}
              className="bg-green-500 font-semibold text-lg rounded-lg px-2 py-1 hover:bg-green-600">
                Save
            </button>
          </div>

          {/* ======= YEAR + MONTH FILTER HEADER ======= */}
          <div className="flex flex-wrap px-3 justify-between items-center mb-5">
            <div className="flex flex-wrap  gap-4 items-center mb-5">

            {/* Start Month */}
            <div>
              <div>
              <label className="text-sm font-semibold text-gray-700">
                Start
              </label>
              </div>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className=" border-2 border-gray-200 text-sm text-gray-700 rounded px-3 py-1"
              >
                {MONTHS.map(month => (
                  <option key={month}>{month}</option>
                ))}
              </select>
            </div>

            {/* End Month */}
            <div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mr-2">
                  End
                </label>
              </div>

              <select
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                className=" border-2 border-gray-200 text-sm text-gray-700 rounded px-3 py-1"
              >
                {MONTHS.map(month => (
                  <option key={month}>{month}</option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mr-2">
                  Academic Year
                </label>
              </div>
              <select
                value={competitorYear}                           
                onChange={(e) => {
                  setCompetitorYear(e.target.value);               {/* only update local state */}
                  initializeCompetitorPerformance(e.target.value); {/* init new year if needed */}
                }}
                className="border-2 border-gray-200 text-sm text-gray-700 rounded px-3 py-1"
              >
                {YEAR_OPTIONS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {/* <div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mr-2">
                  Academic Year
                </label>
              </div>
              <select
                value={competitorYear}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, year: e.target.value }))
                }
                className="border-2 border-gray-200 text-sm text-gray-700 rounded px-3 py-1"
              >
                {YEAR_OPTIONS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div> */}

            
          <div className="relative w-60 competitor-dropdown  border-stone-900">
            <label className="text-sm font-semibold text-gray-600">
              Competitors
            </label>
            {/* Trigger Box */}
            <div
              onClick={() => setIsCompetitorDropdownOpen(prev => !prev)}
              className="border rounded px-3 py-1 bg-white cursor-pointer flex flex-wrap gap-1 items-center min-h-[30px]  border-2 border-gray-200" 
              
            >
            <span className="text-gray-400 text-sm">view or add competitors</span>
            <ChevronDownIcon className="w-4 h-4 ml-auto text-red-800" />
          </div>

          {/* Dropdown Panel */}
          {isCompetitorDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg p-2  border-2 border-gray-200">
          
          {/* Add new competitor */}
          <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newCompetitorName}
            onChange={(e) => setNewCompetitorName(e.target.value)}
            placeholder="Add new competitor"
            className="border px-1 py-2 rounded-lg text-sm text-gray-900 w-full"
            onKeyDown={(e) => {
              if (e.key === "Enter") addCompetitor();
              }}
          />

          <button
            type="button"
            onClick={addCompetitor}
            className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm"
          >
            Add
          </button>
        </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto text-stone-900">
            {filteredCompetitors.map(comp => {
              const isSelected = selectedCompetitors.includes(comp);

              return (
                <div
                  key={comp}
                  onClick={() => {
                    setSelectedCompetitors(prev => {
                      if (prev.includes(comp)) {
                        return prev.filter(c => c !== comp);
                      }

                      return [...prev, comp];
                    });
                  }}
                   className={`
                  flex justify-between items-center px-2 py-1 m-1 rounded
                  ${isSelected
                    ? "bg-green-400 text-white border-green-500"
                    : "bg-gray-100 text-gray-700 border-gray-700"}
                `}
                  // className="flex justify-between items-center px-2 py-2 rounded"
                >
                  <span>{comp}</span>                  
                   {isSelected &&  <CheckIcon className="w-4 h-4 text-black " /> }

                </div>
              );
            })}
          </div>
        </div>
      )}

      </div>
      <div>
        <label className="text-sm font-semibold text-gray-600 mr-2">
          Top Competitors (max 5)
        </label>

        <div className="bg-gray-100 border-2 border-gray-200 text-gray-900 rounded-lg px-2 py-1 text-xs">
          BASED ON : <></>
          <select
            value={topMetric}
            onChange={(e) => setTopMetric(e.target.value)}
            className="px-2 py-1 border border-green-500 rounded-md text-sm bg-green-100"
          >
            <option value="CPL">CPL</option>
            <option value="CPA">CPA</option>
            <option value="CPS">CPS</option>
          </select>
        </div>
      </div>
      <button  
        onClick={handleSaveFilters}
        className={`font-normal text-base rounded-lg px-2 py-1 mt-6 transition-all ${
          filterSaved 
            ? 'bg-emerald-500 text-white ring-2 ring-emerald-300' 
            : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {filterSaved ? '✓ Filters Saved!' : 'Save filters'}
      </button>
      </div>
    </div>
          {/* ================= TABLE ================= */}
          <div className="overflow-x-auto rounded-xl border-2 border-green-200">
            <table className="w-full text-sm [&_td]:text-center [&_input]:mx-auto">
            
          <thead>
            {/* ================= ROW 1: College Names ================= */}
            <tr className="bg-green-50">
              <th className="border-r-1 px-3 py-2 text-stone-900 bg-green-100">
                Data Type / Month
              </th>

              {/* CLIENT COLLEGE */}
              <th colSpan="3" className="border-r-1  text-center text-stone-900">
                {clientCollegeName || "Client Name"}
              </th>

              {/* MAIN COLLEGE */}
              <th colSpan="4" className="border-r-1 text-center text-stone-900">

                CollegeWollege <span className={getCRColor(mainCollegeCR)}>
                  (CR - {mainCollegeCR})
                </span>
              </th>

              {competitorsToShow.map(comp => (
                <th key={comp} colSpan="3" className="border-r-1 text-center text-stone-900">
                  
                  {comp} <span className={getCRColor(mainCollegeCR)}> (CR - {competitorCR[comp] || 0})
                  </span>
                </th>
              ))}
            </tr>

            {/* ================= ROW 2: Deal Type ================= */}
            <tr className="bg-purple-50 text-stone-900">
              <th className="border px-3 py-2 font-semibold bg-purple-100">
                Deal Type
              </th>

            {/* CLIENT EMPTY merge */}
          <th colSpan="3" rowSpan="3" className="border relative">
              {programmesLoading ? (
              <p className="text-xs text-gray-500 text-center">
                Loading programmes...
              </p>
            ) : collegeProgrammes.length > 0 ? (
              <div >
                
                {/* Programme Container */}
                <div
                  className={`
                    flex flex-wrap gap-2 justify-center py-2 px-2
                    ${showAllProgrammes ? "max-h-40 overflow-y-auto pr-1" : ""}
                  `}
                >
                  {(showAllProgrammes
                    ? collegeProgrammes
                    : collegeProgrammes.slice(0, 3)
                  ).map((prog) => (
                    <span
                      key={prog.id}
                      className="px-1 py-1 text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-lg shadow-sm"
                    >
                      {prog.programmeName}
                    </span>
                  ))}
                </div>

                {/* PLUS BUTTON */}
                {collegeProgrammes.length > 3 && !showAllProgrammes && (
                <button
                  type="button"
                  onClick={() => setShowAllProgrammes(true)}
                  className="absolute bottom-1 right-2 z-10 text-xs font-bold bg-blue-500 text-white px-2 py-1 rounded-md shadow hover:bg-blue-600 transition-all"
                >
                  +{collegeProgrammes.length - 3}
                </button>
              )}

              {showAllProgrammes && (         
                <button
                  type="button"
                  onClick={() => setShowAllProgrammes(false)}
                  className="absolute bottom-1 right-2 z-10 text-xs font-bold bg-gray-500 text-white px-2 py-1 rounded-md shadow hover:bg-gray-600 transition-all"
                >
                  −
                </button>

              )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center">
                No programmes
              </p>
            )}
          </th>

            {/* ================= MAIN ================= */}
            <th className="border text-center relative px-2">
              
              <div
                onClick={() =>
                  setBrandingDropdownOpen(
                    brandingDropdownOpen === "main" ? null : "main"
                  )
                }
                className="cursor-pointer flex justify-center items-center gap-2"
              >
                Branding
                <span
                  className={`flex justify-center items-center gap-3 px-2 border-1  py-1 rounded-lg text-sm font-semibold
                  ${brandingSelection.main === "yes" 
                    ? "bg-green-100 text-green-700 border-green-500"
                    : "bg-red-100 text-red-600 border-red-500"}`}
                >
                  {brandingSelection.main === "yes" ? "Yes" : "No"}
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                </span>
              </div>

              {brandingDropdownOpen === "main" && (
                <div className="absolute z-50 mt-2 left-1/2 -translate-x-1/2 w-13 bg-white border rounded-lg shadow-lg py-1">

                  <div
                    onClick={() => setBranding("main", "yes")}
                    className="px-3 py-2 hover:bg-green-50 cursor-pointer text-sm text-green-700 font-semibold"
                  >
                    Yes
                  </div>

                  <div
                    onClick={() => setBranding("main", "no")}
                    className="px-3 py-2 hover:bg-red-50 cursor-pointer text-sm text-red-600 font-semibold"
                  >
                    No
                  </div>

                </div>
              )}

            </th>

            <th className="border text-center px-4">
              <div className="flex justify-center items-center">
                <span>Months</span>
                <input type="number" className="text-stone-900 text-center border-1 font-medium rounded-lg bg-white w-10 h-7" placeholder="0" max="12" min="0"
                  value={
                    formData.competitorPerformance?.[competitorYear]
                      ?.dealConfig?.main?.months ?? ""
                  }
                  onChange={(e) =>
                    handleDealConfigChange("main", "months", e.target.value)
                  }
                />
              </div>
            </th>

          <th className="border px-2 py-2 text-center">

          <div className="flex flex-col items-center gap-1">

          <div className="flex gap-1">

          {["CPL","CPA","CPS"].map(type => {

          const selected = commercialSelection.main?.includes(type);

          return (
            <button
              key={type}
              onClick={() => toggleCommercial("main", type)}
              className={`
                px-2 py-1 text-xs rounded-md border transition
                ${selected
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300"}
              `}
            >
              {type}
            </button>
          );

        })}

          </div>

          {/* Max 1 Selected Message */}
          {/* {commercialWarning.main && (
            <span className="text-[10px] text-orange-500 transition-all duration-150">
              Max one selections allowed
            </span>
          )} */}
          </div>
          </th>
          {/* App rejected - dealtype empty */}
            <th className="border"></th>

            {/* ================= COMPETITORS ================= */}
            {competitorsToShow.map(comp => (
              <React.Fragment key={comp}>
                <th className="border text-center relative px-2">
                <div
                  onClick={() =>
                    setBrandingDropdownOpen(
                      brandingDropdownOpen === comp ? null : comp
                    )
                  }
                  className="cursor-pointer flex justify-center items-center gap-2"
                >
                  Branding

                  <span
                    className={`flex justify-center items-center gap-3 px-2 border-1  py-1 rounded-lg text-sm font-semibold
                    ${brandingSelection[comp] === "yes"
                      ? "bg-green-100 text-green-700 border-green-500"
                      : "bg-red-100 text-red-600 border-red-500"}`}
                  >
                    {brandingSelection[comp] === "yes" ? "Yes" : "No"}
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  </span>

                </div>

                {brandingDropdownOpen === comp && (
                  <div className="absolute z-50 mt-1 left-2/4 -translate-x-1/5 w-13 bg-white border rounded-lg shadow-lg py-1">

                    <div
                      onClick={() => setBranding(comp, "yes")}
                      className="px-3 py-2 hover:bg-green-50 cursor-pointer text-sm text-green-700 font-semibold"
                    >
                      Yes
                    </div>

                    <div
                      onClick={() => setBranding(comp, "no")}
                      className="px-3 py-2 hover:bg-red-50 cursor-pointer text-sm text-red-600 font-semibold"
                    >
                    No
                    </div>

                  </div>
                )}

              </th>


                <th className="border text-center px-4">
                  <div className="flex justify-center items-center gap-2">
                    <span>Months</span>
                    <input type="number" className="text-stone-900 text-center border-1 font-medium rounded-lg bg-white w-10 h-7" placeholder="0" max="12" min="0"
                      value={
                        formData.competitorPerformance?.[competitorYear]
                          ?.dealConfig?.competitors?.[comp]?.months ?? ""
                      }
                      onChange={(e) =>
                        handleDealConfigChange("competitor", "months", e.target.value, comp)
                      }
                    />
                  </div>
                </th>

              <th className="border px-2 py-2 text-center">

            <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1">
            {["CPL","CPA","CPS"].map(type => {

              const selected = commercialSelection[comp]?.includes(type);
              // const branding = brandingSelection[comp] === "yes";

              return (
                <button
                  key={type}
                  onClick={() => toggleCommercial(comp, type)}
                  className={`
                    px-2 py-1 text-xs rounded-md border transition
                    ${selected
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-700 border-gray-300"}
                  `}
                >
                  {type}
                </button>
              );

            })}

            </div>

            {/* Max 1 Selected Message
          {commercialWarning.main && (
            <span className="text-[10px] text-orange-500 transition-all duration-150">
              Max one selections allowed
            </span>

          )} */}
            </div>
            </th>
              </React.Fragment>
            ))}

          </tr>

          <tr className="bg-purple-50 text-stone-900">

            <th className="border px-3 py-2 font-semibold bg-purple-100">
              Deal Size
            </th>

            {/* ================= MAIN ================= */}
            <th className="border text-center px-2">
              <div className="flex justify-center items-center gap-2">
                <span>Total Amount</span> 
                <span className="w-22 h-7 flex items-center justify-center rounded-lg shadow-sm  bg-white text-stone-900 font-normal">
                    {getDealTotal("main") || ""}
                  </span>
              </div>
            </th>

            <th className="border text-center px-2">
              <div className="flex justify-center items-center gap-2">
                <span>Branding Amount</span>

                <input
                  type="number"
                  disabled={brandingSelection.main !== "yes"}
                  className={`text-stone-900 text-center border-1 font-medium rounded-lg w-20 h-7
                    ${brandingSelection.main === "yes"
                      ? "bg-white"
                      : "bg-gray-200 opacity-60 cursor-not-allowed"}
                  `}
                  placeholder="0"
                  value={
                    formData.competitorPerformance?.[competitorYear]
                      ?.dealConfig?.main?.brandingAmount ?? ""
                  }
                  onChange={(e) =>
                    handleDealConfigChange("main", "brandingAmount", e.target.value)
                  }
                />
              </div>
            </th>

            <th className="border text-center px-2">
              <div className="flex justify-center items-center gap-2">
                <span>Delivery Based (CPL)</span>
                <input type="number" className="text-stone-900 text-center border-1 font-medium rounded-lg bg-white w-20 h-7" placeholder="0"
                  value={
                    formData.competitorPerformance?.[competitorYear]
                      ?.dealConfig?.main?.deliveryAmount ?? ""
                  }
                  onChange={(e) =>
                    handleDealConfigChange("main", "deliveryAmount", e.target.value)
                  }
                />
              </div>
            </th>

            <th className="border"></th>

            {/* ================= COMPETITORS ================= */}
            {competitorsToShow.map(comp => (
              <React.Fragment key={comp}>

                <th className="border text-center px-2">
                  <div className="flex justify-center items-center gap-2">
                <span>Total Amount</span> 
                <span className="w-22 h-7 flex items-center justify-center rounded-lg shadow-sm  bg-white text-stone-900 font-normal">
                    {getDealTotal("competitor", comp) || ""}
                  </span>
              </div>
                </th>

               <th className="border text-center px-2">
              <div className="flex justify-center items-center gap-2">
                <span>Branding Amount</span>

                <input
                  type="number"
                  disabled={brandingSelection[comp] !== "yes"}
                  className={`text-stone-900 text-center border-1 font-medium rounded-lg w-20 h-7
                    ${brandingSelection[comp] === "yes"
                      ? "bg-white"
                      : "bg-gray-200 opacity-60 cursor-not-allowed"}
                  `}
                  placeholder="0"
                  value={
                    formData.competitorPerformance?.[competitorYear]
                      ?.dealConfig?.competitors?.[comp]?.brandingAmount ?? ""
                  }
                  onChange={(e) =>
                    handleDealConfigChange("competitor", "brandingAmount", e.target.value, comp)
                  }
                />
              </div>
            </th>

                <th className="border text-center px-2">
                  <div className="flex justify-center items-center gap-2">
                    <span>Delivery Based (CPL)</span>
                    <input type="number" className="text-stone-900 text-center border-1 font-medium rounded-lg bg-white w-20 h-7" placeholder="0"
                      value={
                        formData.competitorPerformance?.[competitorYear]
                          ?.dealConfig?.competitors?.[comp]?.deliveryAmount ?? ""
                      }
                      onChange={(e) =>
                        handleDealConfigChange("competitor", "deliveryAmount", e.target.value, comp)
                      }
                    />
                  </div>
                </th>

              </React.Fragment>
            ))}

          </tr>

            {/* ================= ROW 4: Commercials ================= */}
            <tr className="bg-purple-50 font-semibold text-stone-900">

            {/* Left Label */}
            <th className="border px-3 py-2 bg-purple-100">
              Commercials (W/O GST)
            </th>

          <th colSpan="3" className="border px-3 py-2">
              <div className="flex flex-col items-center gap-1">
            <div className="flex gap-2">

              {(commercialSelection.main || []).map(type => (

                <div key={type} className="flex items-center gap-1">

                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                    {type}-
                  </span>

                  <input type="number" className="text-stone-900 bg-white text-center font-medium border-1 rounded-lg w-20 h-7" placeholder="0"
                    value={
                      formData.competitorPerformance?.[competitorYear]
                        ?.commercials?.mainCollege?.[type] ?? ""
                    }
                    onChange={(e) =>
                      handleCommercialValueChange(
                        "main",
                        null,
                        type,
                        e.target.value
                      )
                    }
                  />
                </div>
              ))}
            </div>

            {(commercialSelection.main || []).length === 0 && (
              <span className="text-xs text-gray-400">
                Select CPL / CPA / CPS above
              </span>
            )}
          </div>
        </th>

          

            {/* Empty cell for App Rejected alignment */}
            <th className="border px-3 py-2"></th>

            {/* ===== COMPETITORS ===== */}
            {competitorsToShow.map(comp => (
              <React.Fragment key={comp}>

                <th colSpan="3" className="border px-3 py-2">
                  <div className="flex flex-col items-center gap-1">

                <div className="flex gap-2">

                  {(commercialSelection[comp] || []).map(type => (
                    <div key={type} className="flex items-center gap-2">

                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        {type}
                      </span>

                      <input type="number" className="text-stone-900 bg-white text-center border-1 rounded-lg w-20 h-7" placeholder="0"
                        value={
                          formData.competitorPerformance?.[competitorYear]
                            ?.commercials?.competitors?.[comp]?.[type] ?? ""
                        }
                        onChange={(e) =>
                          handleCommercialValueChange(
                            "competitor",
                            comp,
                            type,
                            e.target.value
                          )
                        }
                      />

                    </div>
                  ))}
                </div>

                {/* {(commercialSelection[comp] || []).length === 0 && (
                  <span className="text-xs text-gray-400">
                    Select CPL / CPA / CPS above
                  </span>
                )} */}
                </div>
              </th>
              </React.Fragment>
            ))}

          </tr>                                      

            {/* ================= ROW 5: Delivered + Labels ================= */}
            <tr className="bg-gray-100 text-stone-900">

              <th className="border px-3 py-2">
                Delivered
              </th>

              {/* CLIENT COLLEGE */}
              <th className="border px-6">Leads</th>
              <th className="border px-6">Apps</th>
              <th className="border px-2">Admissions</th>

              {/* MAIN COLLEGE */}
              <th className="border">Leads</th>
              <th className="border">Apps</th>
              <th className="border">Admissions</th>
              <th className="border px-2">Apps Rejected</th>

              {competitorsToShow.map(comp => (
                <React.Fragment key={comp}>
                  <th key={comp + "-leads"} className="border">Leads</th>
                  <th key={comp + "-apps"} className="border">Apps</th>
                  <th key={comp + "-admissions"} className="border ">Admissions</th>
                </React.Fragment>
              ))}
            </tr>

          </thead>
              
              <tbody> 
            {filteredMonths.map(month => {
              const monthData = formData.competitorPerformance?.[competitorYear]?.[month];
              if (!monthData) return null;

              return (
                <tr key={month} className="border border-1  border-stone-400">

                  {/* Month */}
                  <td className="px-3 py-2 font-semibold text-stone-900">{month}</td>

                  {/* CLIENT COLLEGE */}
                  <td>
                    <input type="number" className="text-stone-900 text-center border-1 rounded-lg w-20 h-7" placeholder="0"
                      value={monthData.clientCollege?.leads || ""}
                      onChange={(e) =>
                        handleClientCollegeChange(month, "leads", e.target.value)
                      }
                    />
                  </td>

                  <td >
                    <input type="number" className="text-stone-900 text-center border-1 rounded-lg w-20 h-7" placeholder="0"
                      value={monthData.clientCollege?.apps || ""}
                      onChange={(e) =>
                        handleClientCollegeChange(month, "apps", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input type="number" className="text-stone-900 text-center border-1 rounded-lg w-20 h-7" placeholder="0"
                      value={monthData.clientCollege?.admissions || ""}
                      onChange={(e) =>
                        handleClientCollegeChange(month, "admissions", e.target.value)
                      }
                    />
                  </td>

                  {/* MAIN COLLEGE */}
                  <td>
                    <input type="number" className="text-stone-900 text-center border-1 rounded-lg w-20 h-7" placeholder="0" value={monthData.mainCollege.leads || ""}
                    onChange={(e)=>handleMainCollegeChange(month,"leads",e.target.value)}/>
                  </td>

                  <td><input type="number" className="text-stone-900 text-center border-1 rounded-lg w-20 h-7" placeholder="0"  value={monthData.mainCollege.apps || ""}
                    onChange={(e)=>handleMainCollegeChange(month,"apps",e.target.value)} /></td>

                  <td><input type="number" className="text-stone-900 text-center border-1 rounded-lg w-20 h-7" placeholder="0"  value={monthData.mainCollege.admissions || ""}
                    onChange={(e)=>handleMainCollegeChange(month,"admissions",e.target.value)} /></td>

                  <td><input type="number" className="text-stone-900 text-center border-1 rounded-lg w-10 h-7" placeholder="0"  value={monthData.mainCollege.appRejected || ""}
                    onChange={(e)=>handleMainCollegeChange(month,"appRejected",e.target.value)} /></td>

                  {/* COMPETITORS */}
                  {competitorsToShow.map(comp => (
                    <React.Fragment key={comp}>
                      <td>
                        <input type="number" className="text-stone-900 text-center border-1 rounded-lg w-20 h-7"
                          value={monthData.competitors?.[comp]?.leads || ""}
                          placeholder="0"
                          onChange={(e)=>handleCompetitorChange(month,comp,"leads",e.target.value)}
                          
                        />
                      </td>

                      <td>
                        <input type="number" className="text-stone-900 text-center border-1 rounded-lg w-20 h-7"
                          value={monthData.competitors?.[comp]?.apps || ""}
                          placeholder="0"
                          onChange={(e)=>handleCompetitorChange(month,comp,"apps",e.target.value)}
                        />
                      </td>

                      <td>
                        <input type="number" className="text-stone-900 text-center border-1 rounded-lg w-20 h-7 " placeholder="0" 
                          value={monthData.competitors?.[comp]?.admissions || ""}
                          
                          onChange={(e)=>handleCompetitorChange(month,comp,"admissions",e.target.value)}
                        />
                      </td>
                    </React.Fragment>
                  ))}

                </tr>
              );
            })}

            {/* TOTAL ROW */}
            {totals && (
              <tr className="bg-gray-200 font-semibold">
                
                {/* Label */}
                <td className="px-3 py-2 bg-stone-700">Total</td>

                {/* CLIENT TOTALS */}
                <td className="text-center bg-stone-400">{totals.clientCollege.leads}</td>
                <td className="text-center bg-stone-400">{totals.clientCollege.apps}</td>
                <td className="text-center bg-stone-400">{totals.clientCollege.admissions}</td>

                {/* MAIN COLLEGE TOTALS */}
                <td className="text-center bg-stone-400">{totals.mainCollege.leads}</td>
                <td className="text-center bg-stone-400">{totals.mainCollege.apps}</td>
                <td className="text-center bg-stone-400">{totals.mainCollege.admissions}</td>
                <td className="text-center bg-stone-400">{totals.mainCollege.appRejected}</td>

                {/* COMPETITOR TOTALS */}
                {competitorsToShow.map(comp => (
                  <React.Fragment key={comp}>
                    <td key={comp + "-total-leads"} placeholder="0" className="text-center bg-stone-400">
                      {totals.competitors[comp]?.leads ?? ""}
                    </td>
                    <td key={comp + "-total-apps"} placeholder="0" className="text-center bg-stone-400">
                      {totals.competitors[comp]?.apps ?? ""}
                    </td>
                    <td key={comp + "-total-admissions"} placeholder="0" className="text-center bg-stone-400">
                      {totals.competitors[comp]?.admissions ?? ""}
                    </td>
                  </React.Fragment>
                ))}

              </tr>
            )}

            {totals && (
              <tr className="bg-gray-200 font-semibold bg-purple-50 text-stone-900">
                
                {/* Label */}
                <td className="px-3 py-2 bg-purple-100 text-stone-900">Effective Comercials (W/O GST)</td>

                {/* CLIENT TOTALS */}
                <td></td>
                <td></td>
                <td></td>

                {/* MAIN COLLEGE TOTALS */}
                <td>CPL - {calculateEffectiveCommercial(getDealTotal("main"),
                  totals?.mainCollege?.leads)}</td>
                <td>CPA - {calculateEffectiveCommercial(getDealTotal("main"),
                  totals?.mainCollege?.apps)}</td>
                <td>CPS - {calculateEffectiveCommercial(getDealTotal("main"),
                  totals?.mainCollege?.admissions)}</td>
                <td></td>

                {/* COMPETITOR TOTALS */}
                {competitorsToShow.map(comp => (
                  <React.Fragment key={comp}>
                    <td key={comp + "-total-leads"} placeholder="0">CPL - 
                       {calculateEffectiveCommercial(getDealTotal("competitor", comp), totals?.competitors?.[comp]?.leads)}
                    </td>
                    <td key={comp + "-total-apps"}>CPA - 
                      {calculateEffectiveCommercial(getDealTotal("competitor", comp), totals?.competitors?.[comp]?.apps)}
                    </td>
                    <td key={comp + "-total-admissions"}>CPS - 
                      {calculateEffectiveCommercial(getDealTotal("competitor", comp),
                      totals?.competitors?.[comp]?.admissions)}
                    </td>
                  </React.Fragment>
                ))}

              </tr>
            )}

            {/* % Share of Total */}
            <tr className="font-mormal text-stone-900">
              <td className="px-3 py-2  font-semibold text-stone-900">% Share of total</td>

              {/* CLIENT COLLEGE */}
              <td>100%</td>
              <td>100%</td>
              <td>100%</td>

              {/* Main College */}
              <td>{calculateShare(totals?.mainCollege?.leads,totals?.clientCollege?.leads)}</td>
              <td>{calculateShare(totals?.mainCollege?.apps,totals?.clientCollege?.apps)}</td>
              <td>{calculateShare(totals?.mainCollege?.admissions,totals?.clientCollege?.admissions)}</td>
              <td></td>

              {/* Competiotor Colleges */}
              {competitorsToShow.map(comp => (
                  <React.Fragment key={comp}>
                    <td>
                       {calculateShare(totals?.competitors?.[comp].leads,totals?.clientCollege?.leads)}
                    </td>
                    <td> 
                      {calculateShare(totals?.competitors?.[comp]?.apps,totals?.clientCollege?.apps)}
                    </td>
                    <td>
                      {calculateShare(totals?.competitors?.[comp]?.admissions,totals?.clientCollege?.admissions)}
                    </td>
                  </React.Fragment>
              ))}
            </tr>
              </tbody>
            </table>  
          </div>
        </div>
      </SectionPermissionWrapper>
    )}

    {/* CRM Information Section */}
    <SectionPermissionWrapper 
      section={CLIENT_SECTIONS.CRM_DETAILS} 
      canView={canAccess(CLIENT_SECTIONS.CRM_DETAILS, 'view')} 
      canEdit={canEdit(CLIENT_SECTIONS.CRM_DETAILS)}
      title="CRM Details"
    >
    <div className="bg-white mt-3 rounded-3xl shadow-xl sm:p-8 p-3 border-2 border-purple-100">
      <div className="flex items-center space-x-3 mb-6">
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h2 className="sm:text-2xl text-lg font-bold text-gray-800">CRM Details</h2>
      </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CRM Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              CRM Type 
            </label>
            <select
              name="crmType"
              value={formData.crmType || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all text-black"
            >
              <option value="">Select CRM Type</option>
                <option value="meritto">Meritto</option>
                <option value="meritto">Extra Edge</option>
              <option value="Salesforce">Salesforce</option>
              <option value="HubSpot">HubSpot</option>
              <option value="LeadSquared">LeadSquared</option>
              <option value="Zoho CRM">Zoho CRM</option>
              <option value="Pipedrive">Pipedrive</option>
              <option value="Freshsales">Freshsales</option>
              <option value="Custom">Custom CRM</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* CRM ID */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              CRM ID / Username
            </label>
            <input
              type="text"
              name="crmId"
              value={formData.crmId || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all text-black"
              placeholder="Enter CRM ID"
            />
          </div>

          {/* CRM Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              CRM Password
            </label>
            <input
              type="password"
              name="crmPassword"
              value={formData.crmPassword || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all text-black"
              placeholder="Enter CRM password"
            />
          </div>

          {/* CRM Link */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              CRM Link / URL
            </label>
            <input
              type="url"
              name="crmLink"
              value={formData.crmLink || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all text-black"
              placeholder="https://crm.example.com"
            />
          </div>

          {/* OTP Required */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-200">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  OTP Required
                </label>
                <p className="text-xs text-gray-500">Enable if CRM requires OTP for authentication</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, otpRequired: !prev.otpRequired }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  formData.otpRequired ? 'bg-green-600' : 'bg-gray-400'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.otpRequired ? 'sm:translate-x-6 translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Excel Upload Section for CRM Integration */}
          <div className="md:col-span-2 space-y-3 mt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Upload Excel Files for CRM Mapping</label>
                <p className="sm:text-xs text-xs text-gray-500">
                  Upload Excel files to map CRM fields. Files will be available in API Config section for download.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={apiExcelInputRef}
                  onChange={handleApiExcelUpload}
                  accept=".xlsx,.xls,.pdf,.csv"
                  multiple
                  className="hidden"
                  id="crm-excel-upload"
                />
                <label
                  htmlFor="crm-excel-upload"
                  className="cursor-pointer sm:px-4 px-2 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2 font-semibold"
                >
                  <ArrowUpTrayIcon className="w-5 h-5" />
                  Upload Excel(s)
                </label>
              </div>
            </div>

            {apiExcelUploadError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 font-medium text-sm">{apiExcelUploadError}</p>
              </div>
            ) : null}

            {crmExcelFilesToUpload.length > 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-700 font-medium text-sm">
                  ✓ {crmExcelFilesToUpload.length} file(s) uploaded successfully. Go to API Config section to download.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                <p className="sm:text-sm text-xs text-gray-600">Upload Excel files to configure CRM field mapping.</p>
              </div>
            )}
          </div>
            
        </div>
    </div>
    </SectionPermissionWrapper>

    {/* Campaign & Limits Card | DELIVERY DLL */}
    <SectionPermissionWrapper 
      section={CLIENT_SECTIONS.DELIVERY_DLL} 
      canView={canAccess(CLIENT_SECTIONS.DELIVERY_DLL, 'view')} 
      canEdit={canEdit(CLIENT_SECTIONS.DELIVERY_DLL)}
      title="Delivery & DLL"
    >
    <div className="bg-white mt-3 rounded-3xl shadow-xl sm:p-8 p-3 border-2 border-orange-100">
      <div className="flex items-center space-x-3 mb-5">
        <ChartBarIcon className="w-6 h-6 text-orange-600" />
        <h2 className="sm:text-2xl text-lg font-bold text-gray-800">Delivery & DLL</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 sm:gap-6 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Total Push Leads Limit
          </label>
          <input
            type="number"
            name="pushLeadsLimit"
            value={formData.pushLeadsLimit ?? ''}
            onChange={handleInputChange}
            className="w-full sm:px-4 px-2 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all text-black"
            placeholder="e.g., 500"
          />
        </div>

        {/* Daily Push Limit */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Daily Push Limit
          </label>
          <div className="flex items-center sm:gap-4 gap-1">
            <input
              type="number"
              name="dailyPushLimit"
              value={formData.dailyPushLimit ?? ''} 
              onChange={handleInputChange}
              className="flex-1 sm:px-4 px-2 py-3 border-2 border-gray-200 rounded-xl  focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all text-black"
              placeholder="e.g., 50"
            />
            <div className="flex items-center sm:gap-2 gap-1 sm:px-4 px-1 py-2 bg-gray-50 rounded-xl border-2 border-gray-200">
              <label className="sm:text-sm text-xs font-medium text-gray-700 cursor-pointer" htmlFor="dailyLimitTypeToggle">
                {formData.dailyLimitType === 'primary' ? 'Primary' : 'Total'}
              </label>
              <button
                type="button"
                id="dailyLimitTypeToggle"
                onClick={() => handleInputChange({
                  target: {
                    name: 'dailyLimitType',
                    value: formData.dailyLimitType === 'primary' ? 'secondary' : 'primary'
                  }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  formData.dailyLimitType === 'primary' ? 'bg-green-600' : 'bg-gray-400'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.dailyLimitType === 'primary' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            💡 Primary: counts only if API response is success. Total limit: counts all attempts.
          </p>
        </div>

        {/* Monthly Limits Section */}
        {monthsArray.length > 0 && (
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Monthly Push Limits (Auto-Populated)
            </label>
            <div className="bg-gradient-to-br from-white-50 to-white-50 rounded-xl p-4 border-2 border-white-200">
              <p className="text-xs text-gray-600 mb-3">
              Set limits for each month from Active Date to Expired Date. Total of all monthly limits cannot exceed {formData.pushLeadsLimit || 'the Total Push Leads Limit'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthsArray.map((month) => {
                  const currentLimit = (formData.monthlyLimits && formData.monthlyLimits[month.key]) || '';
                  return (
                    <div key={month.key} className="bg-white rounded-lg p-3 border border-white-200 shadow-sm">
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        {month.label}
                      </label>
                      <input
                        type="number"
                        value={currentLimit}
                        onChange={(e) => handleMonthlyLimitChange(month.key, e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-white-300 focus:border-white-400 transition-all text-black text-sm"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  );
                })}
              </div>
              {/* Total Monthly Limits Display */}
              {/* <div className="mt-4 flex items-center justify-between bg-white rounded-lg p-3 border-2 border-orange-300">
                <span className="text-sm font-semibold text-gray-700">Total Monthly Limits:</span>
                <span className={`text-lg font-bold ${
                  Object.values(formData.monthlyLimits).reduce((sum, limit) => sum + (typeof limit === 'number' ? limit : 0), 0) > (parseInt(formData.pushLeadsLimit) || 0)
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                  {Object.values(formData.monthlyLimits).reduce((sum, limit) => sum + (typeof limit === 'number' ? limit : 0), 0)} / {formData.pushLeadsLimit || '∞'}
                </span>
              </div> */}
            </div>
          </div>
        )}
        
        {/* Show message when no dates are selected */}
        {!formData.activeDate || (!formData.expiryDate && !formData.inactiveDate) ? (
          <div className="md:col-span-2">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="sm:text-sm text-xs text-blue-700">
                ℹ️ Set Active Date and Expired Date (Inactive Date) to auto-populate monthly push limit boxes. Each month from active to expired date will be shown for you to set individual limits.
              </p>
            </div>
          </div>
        ) : null}

        {/* { Ad approval toggle} */}

        {/* <div className = "md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Ad Approval *
          </label>
          <div className="flex items-center gap-4">
              <button
                type="button"
                id="dailyLimitTypeToggle"
                onClick={() => handleInputChange({
                  target: {
                    name: 'dailyLimitType',
                    value: formData.dailyLimitType === 'on' ? 'off' : 'on'
                  }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  formData.dailyLimitType === 'on' ? 'bg-green-600' : 'bg-gray-400'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.dailyLimitType === 'on' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
          </div>
        </div> */}
      </div>
    </div>
    </SectionPermissionWrapper>

    {/* Location Information Card
    <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-green-100">
      <div className="flex items-center space-x-3 mb-6">
        <MapPinIcon className="w-6 h-6 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-800">Location Information</h2>
      </div>

      {locationError && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{locationError}</p>
          <button
            type="button"
            onClick={loadLocations}
            className="text-sm font-semibold text-red-700 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}
    </div> */}
  


  <SectionPermissionWrapper 
      section={CLIENT_SECTIONS.COURSE_DETAILS} 
      canView={canAccess(CLIENT_SECTIONS.COURSE_DETAILS, 'view')} 
      canEdit={canEdit(CLIENT_SECTIONS.COURSE_DETAILS)}
      title="Courses Details"
      >
    <div className="bg-white mt-3 rounded-3xl shadow-xl sm:p-8 p-3 border-2 border-purple-100">
      <div className="flex items-center space-x-3 mb-6">
        <AcademicCapIcon className="w-6 h-6 text-purple-600" />
        <h2 className="sm:text-2xl text-lg font-bold text-gray-800">Courses Details</h2>
      </div>
      
      <div className="space-y-6">
        {/* Institution Type */}


        {/* Courses */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Courses Offered
          </label>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={courseSearch}
                  onChange={handleCourseSearchChange}
                  onKeyDown={handleCourseSearchKeyDown}
                  className="w-full rounded-xl border-2 border-purple-100 bg-white px-4 py-3 pr-12 text-sm text-black shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  placeholder="Search or add courses"
                />
                {courseSearch ? (
                  <button
                    type="button"
                    onClick={() => setCourseSearch('')}
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-purple-100 text-purple-600 transition hover:bg-purple-200"
                    aria-label="Clear search"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleAddCourseFromSearch}
                disabled={!hasCourseSearch}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-purple-200 ${
                  hasCourseSearch
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:from-purple-600 hover:to-indigo-700'
                    : 'cursor-not-allowed bg-gray-100 text-gray-400'
                }`}
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Course</span>
              </button>
            </div>

            {Array.isArray(formData.courses) && formData.courses.length ? (
              <div className="flex flex-wrap gap-2">
                {formData.courses.map((courseName) => {
                  const trimmedName = courseName?.toString().trim();
                  if (!trimmedName) {
                    return null;
                  }
                  const key = `selected-${trimmedName.toLowerCase()}`;
                  return (
                    <span
                      key={key}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                    >
                      <span className="max-w-[180px] truncate">{trimmedName}</span>
                      <button
                        type="button"
                        onClick={() => handleCourseToggle(trimmedName)}
                        className="rounded-full bg-white/20 p-1 text-white/80 transition hover:bg-white/30 hover:text-white"
                        aria-label={`Remove ${trimmedName}`}
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No courses selected yet. Use the search above or pick from the catalogue below.
              </p>
            )}

            {/* Course-wise Push Limits */}
            {Array.isArray(formData.courses) && formData.courses.length > 0 && (
              <div className="rounded-2xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 sm:p-6 p-2 shadow-md">
                <div className="mb-4 flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-purple-600" />
                  <h3 className="sm:text-base text-sm font-bold text-gray-800">Course-wise Push Limits</h3>
                  <span className="ml-auto text-xs text-purple-600 font-medium">Optional: Set limits per course</span>
                </div>

                {/* Limit Calculation Summary */}
                {(limitCalculation.remainingTotal !== null || limitCalculation.remainingDaily !== null) && (
                  <div className={`mb-4 rounded-xl p-4 ${limitCalculation.hasError ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">
                        Course Limits Total: <span className={limitCalculation.hasError ? 'text-red-600' : 'text-green-600'}>{limitCalculation.totalCourseLimits}</span>
                      </span>
                      {limitCalculation.remainingTotal !== null && (
                        <span className={`text-sm font-semibold ${limitCalculation.hasError ? 'text-red-600' : 'text-green-600'}`}>
                          Total Remaining: {limitCalculation.remainingTotal}/{limitCalculation.totalPushLimit}
                        </span>
                      )}
                    </div>
                    {limitCalculation.remainingDaily !== null && (
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${limitCalculation.hasError ? 'text-red-600' : 'text-green-600'}`}>
                          Daily Remaining: {limitCalculation.remainingDaily}/{limitCalculation.dailyPushLimit}
                        </span>
                      </div>
                    )}
                    {limitCalculation.hasError && (
                      <p className="text-xs text-red-600 mt-2 font-medium">⚠️ {limitCalculation.errorMessage}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.courses
                    .filter(courseName => courseName?.toString().trim())
                    .map((courseName, index) => {
                      const trimmedName = courseName.toString().trim();
                      return (
                        <div key={`course-limit-${trimmedName}-${index}`} className="rounded-xl border-2 border-purple-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 truncate" title={trimmedName}>
                          {trimmedName}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={programDistribution[trimmedName] || ""}
                            // value={coursePushLimits[trimmedName] || ''}
                            onChange={(e) => handleCoursePushLimitChange(trimmedName, e.target.value)}
                            className="w-full rounded-lg border-2 border-purple-100 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                            placeholder="Daily limit"
                          />
                          <ChartBarIcon className="h-5 w-5 text-purple-400 flex-shrink-0" />
                        </div>
                        {coursePushLimits[trimmedName] && (
                          <p className="mt-1 text-xs text-purple-600 font-medium">
                            Max {coursePushLimits[trimmedName]} leads/day
                          </p>
                        )}

{index !== 0 && index !== formData.courses.length - 1 && (
<div className="flex justify-center items-center text-black text-sm font-semibold text-gray-700 mt-3 gap-3">Percentage : 
<input
 type="number"
 placeholder="%"
 value={programPercentages[trimmedName] || ""}
 onChange={(e)=>handlePercentageChange(trimmedName,e.target.value)}
 className={`text-black border text-right rounded px-2 py-1 w-15 ${
    percentageError ? "border-red-500 bg-red-50" : ""
  }`}
/>
</div>
)}

                      </div>
                    );
                  })}
                </div>
                {percentageError && (
  <div className="mb-4 p-3 rounded-lg border border-red-300 bg-red-50 text-red-600 font-semibold text-sm">
    ⚠ Total percentage cannot exceed 100%
  </div>
)}
                <p className="mt-4 text-xs text-gray-500 italic">
                  💡 Leave blank for unlimited. These limits override the general daily push limit for specific courses.
                </p>
              </div>
            )}

            {(courseLevels.length > 0 || uncategorizedCourseCount > 0) && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-purple-100 bg-purple-50/60 p-3">
                {courseLevels.map((level) => {
                  const id = String(level.id);
                  const isActive = selectedCourseLevelIds.includes(id);
                  const courseCount =
                    level.courseCount ?? level.totalCourses ?? level.count ?? level.total ?? '';
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleCourseLevelToggle(id)}
                      className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                          : 'border border-purple-200 bg-white text-purple-700 hover:border-purple-300 hover:bg-purple-100'
                      }`}
                    >
                      <span>{level.name || `Level ${id}`}</span>
                      {courseCount ? (
                        <span className={isActive ? 'text-[10px] text-purple-100' : 'text-[10px] text-purple-500'}>
                          {courseCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {uncategorizedCourseCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleCourseLevelToggle('unassigned')}
                    className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                      selectedCourseLevelIds.includes('unassigned')
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                        : 'border border-purple-200 bg-white text-purple-700 hover:border-purple-300 hover:bg-purple-100'
                    }`}
                  >
                    <span>Other Programs</span>
                    <span
                      className={
                        selectedCourseLevelIds.includes('unassigned')
                          ? 'text-[10px] text-purple-100'
                          : 'text-[10px] text-purple-500'
                      }
                    >
                      {uncategorizedCourseCount}
                    </span>
                  </button>
                )}
                {selectedCourseLevelIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCourseFilters}
                    className="ml-auto text-xs font-semibold text-purple-600 underline decoration-dotted underline-offset-2 hover:text-purple-800"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {coursesError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {coursesError}
              </div>
            ) : null}

            {coursesNotice && !coursesError ? (
              <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3 text-xs font-semibold text-purple-700">
                {coursesNotice}
              </div>
            ) : null}

            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {!formData.collegeId ? (
                <p className="text-sm text-gray-500">Select a college to load its course catalogue.</p>
              ) : coursesLoading ? (
                <p className="text-sm text-gray-500">Loading courses...</p>
              ) : coursesError ? (
                <p className="text-sm text-gray-500">Unable to display courses. Adjust filters or retry after fixing the issue above.</p>
              ) : groupedCourses.length ? (
                groupedCourses.map((group, groupIndex) => {
                  const groupKey = group.levelId || group.levelName || `group-${groupIndex}`;
                  return (
                    <div key={groupKey} className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-purple-700">{group.levelName}</p>
                          {group.levelDescription ? (
                            <p className="text-xs text-purple-500">{group.levelDescription}</p>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-purple-100 px-2 py-1 text-[11px] font-semibold text-purple-600">
                          {group.courses.length} {group.courses.length === 1 ? 'course' : 'courses'}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {group.courses.map((course) => {
                          const label = course?.name?.trim();
                          if (!label) {
                            return null;
                          }
                          const normalized = label.toLowerCase();
                          const isSelected = selectedCourseSet.has(normalized);
                          const key = course.id ? `course-${course.id}` : `course-${normalized}`;
                          const durationLabel = course.duration ? `${course.duration} months` : '';
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleCourseToggle(label)}
                              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all ${
                                isSelected
                                  ? 'border-purple-500 bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                                  : 'border-purple-100 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                              }`}
                            >
                              <div className="flex-1">
                                <p className="truncate">{label}</p>
                                {durationLabel ? (
                                  <p className={isSelected ? 'text-xs text-purple-100' : 'text-xs text-purple-500'}>
                                    {durationLabel}
                                  </p>
                                ) : null}
                              </div>
                              {isSelected ? (
                                <CheckIcon className="h-4 w-4 flex-shrink-0 text-white" />
                              ) : (
                                <PlusIcon className="h-4 w-4 flex-shrink-0 text-purple-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : courseOptions.length ? (
                <p className="text-sm text-gray-500">No courses match your search or filters. Adjust the filters above or add a custom course.</p>
              ) : (
                <p className="text-sm text-gray-500">No catalogued courses available. You can still add courses manually.</p>
              )}
            </div>
          </div>
          {errors.courses && (
            <p className="mt-1 text-sm text-red-600">{errors.courses}</p>
          )}
        </div>
      </div>
    </div>
    </SectionPermissionWrapper>

              {/* <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-green-100">
      <div className="flex items-center space-x-3 mb-6">
        <PlayPauseIcon className="w-6 h-6 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-800">Ad Approval</h2>
      </div>
      <div className = "text-black">
        <label >Start Date</label>
        <input 
        type = 'date'
        name = "adstartdate"
        value = {formData.adstartdate}
        onChange = {handleInputChange}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
        />
      </div>
                  <div>
        <label >End Date</label>
        <input 
        type = 'date'
        name = "adstartdate"
        value = {formData.adstartdate}
        onChange = {handleInputChange}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all text-black"
        />
      </div>
                  <div>
        <label >Select Ad </label>
        <options >Google Ads</options>
      </div>
    </div> */}     
    </>
  )
}
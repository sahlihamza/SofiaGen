import Ajv from "ajv";
import csvToJson from "csvtojson";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

//internal import
import useUtilsFunction from "./useUtilsFunction";
import useDisableForDemo from "./useDisableForDemo";
import { SidebarContext } from "@/context/SidebarContext";
import AttributeServices from "@/services/AttributeServices";
import ProductCategoryServices from "@/services/ProductCategoryServices";
import CouponServices from "@/services/CouponServices";
import CurrencyServices from "@/services/CurrencyServices";
import CustomerServices from "@/services/CustomerServices";
import ProductServices from "@/services/ProductServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { resolveRoleNames } from "@/utils/roleUtils";
import { DEFAULT_PAGE_SIZE } from "@/config/tableConfig";

// Product categories are flat and single-language: the name is a plain string
// and the hierarchy is carried by parentId.
const categorySchema = {
  type: "object",
  properties: {
    _id: { type: "string" },
    name: { type: "string" },
    slug: { type: "string" },
    parentId: { type: ["string", "null"] },
    status: { type: "string" },
  },
  required: ["name"],
};
const attributeSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    description: { type: "string" },
    isVariation: { type: "boolean" },
  },
  required: ["name"],
};
const couponSchema = {
  type: "object",
  properties: {
    title: { type: "object" },
    couponCode: { type: "string" },
    endTime: { type: "string" },
    discountPercentage: { type: "number" },
    minimumAmount: { type: "number" },
    productType: { type: "string" },
    logo: { type: "string" },
    discountType: { type: "object" },
    status: { type: "string" },
  },
  required: ["title", "couponCode", "endTime", "status"],
};
const customerSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    email: { type: "string" },
  },
  required: ["name", "email"],
};

const normalizeRoleValue = (role) => {
  const roleItems = Array.isArray(role) ? role : role ? [role] : [];

  return roleItems
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      return item?.name || item?._id || "";
    })
    .filter(Boolean);
};

const normalizeSearch = (str) =>
  str
    ?.toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const defaultRoleOptions = [];

const useFilter = (data, roleOptions = defaultRoleOptions) => {
  const ajv = new Ajv({ allErrors: true });

  const [filter, setFilter] = useState("");
  const [sortedField, setSortedField] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchCoupon, setSearchCoupon] = useState("");
  const [searchOrder, setSearchOrder] = useState("");
  const [categoryType, setCategoryType] = useState("");
  const [attributeTitle, setAttributeTitle] = useState("");
  const [country, setCountry] = useState("");
  const [zone, setZone] = useState("");
  const [language, setLanguage] = useState("");
  const [currency, setCurrency] = useState("");
  const [pending, setPending] = useState([]);
  const [processing, setProcessing] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [time, setTime] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dataTable, setDataTable] = useState([]); //tableTable for showing on table according to filtering
  const [todayOrder, setTodayOrder] = useState("");
  const [monthlyOrder, setMonthlyOrder] = useState("");
  const [totalOrder, setTotalOrder] = useState("");
  const [selectedFile, setSelectedFile] = useState([]);
  const [filename, setFileName] = useState("");
  const [isDisabled, setIsDisable] = useState(false);
  const [shipping, setShipping] = useState("");
  const [newProducts] = useState([]);
  const currencyRef = useRef("");
  const searchRef = useRef("");
  const userRef = useRef("");
  const couponRef = useRef("");
  const orderRef = useRef("");
  const categoryRef = useRef("");
  const attributeRef = useRef("");
  const countryRef = useRef("");
  const languageRef = useRef("");
  const taxRef = useRef("");
  const shippingRef = useRef("");

  dayjs.extend(isBetween);
  dayjs.extend(isToday);
  const location = useLocation();
  const { lang, setIsUpdate, setLoading } = useContext(SidebarContext);
  const { globalSetting } = useUtilsFunction();

  const { handleDisableForDemo } = useDisableForDemo();

  //service data filtering
  const serviceData = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - time);
    let services = (Array.isArray(data) ? data : []).map((el) => {
    const newDate = new Date(el?.updatedAt).toLocaleString("en-US", {
      timeZone: globalSetting?.default_time_zone || "UTC",
    });
      const newObj = {
        ...el,
        updatedDate: newDate === "Invalid Date" ? "" : newDate,
      };
      return newObj;
    });
    //products filtering
    if (filter) {
      services = services.filter((item) => item.parent === filter);
    }
    if (sortedField === "Low") {
      services = [...services].sort((a, b) => a.price - b.price);
    }
    if (sortedField === "High") {
      services = [...services].sort((a, b) => b.price - a.price);
    }
    if (searchText) {
      const term = normalizeSearch(searchText);
      services = services.filter((search) =>
        normalizeSearch(search?.title)?.includes(term)
      );
    }

    if (attributeTitle) {
      const term = normalizeSearch(attributeTitle);
      services = services.filter(
        (search) =>
          normalizeSearch(search?.name)?.includes(term) ||
          normalizeSearch(search?.slug)?.includes(term)
      );
    }

    if (categoryType) {
      const term = normalizeSearch(categoryType);
      services = services.filter((search) => {
        const name =
          typeof search?.name === "string" ? search.name : search?.name?.[lang];

        return (
          normalizeSearch(name)?.includes(term) ||
          normalizeSearch(search?.slug)?.includes(term) ||
          normalizeSearch(search?.category)?.includes(term)
        );
      });
    }

    //admin Filtering
    if (role) {
      services = services.filter((staff) => {
        const staffRoles = roleOptions.length
          ? resolveRoleNames(staff?.role, roleOptions)
          : normalizeRoleValue(staff?.role);
        return staffRoles.includes(role);
      });
    }
    //User and Admin filtering
    if (searchUser) {
      services = services.filter(
        (search) =>
          normalizeSearch(
            typeof search?.name === "string" ? search.name : search?.name?.[lang]
          )?.includes(normalizeSearch(searchUser)) ||
          normalizeSearch(search?.phone)?.includes(normalizeSearch(searchUser)) ||
          normalizeSearch(search?.email)?.includes(normalizeSearch(searchUser))
      );
    }
    //Coupon filtering
    if (searchCoupon) {
      const term = normalizeSearch(searchCoupon);
      services = services?.filter(
        (search) =>
          normalizeSearch(search?.title?.[lang])?.includes(term) ||
          normalizeSearch(search?.couponCode)?.includes(term)
      );
    }
    // order filtering
    if (status) {
      services = services.filter((order) => order.status === status);
    }
    if (searchOrder) {
      const term = normalizeSearch(searchOrder);
      services = services.filter((search) =>
        normalizeSearch(search.contact)?.includes(term)
      );
    }
    if (time) {
      services = services.filter((order) =>
        dayjs(order.createdAt).isBetween(date, new Date())
      );
    }

    //country filtering
    if (country) {
      const term = normalizeSearch(country);
      services = services.filter(
        (cou) =>
          normalizeSearch(cou?.name)?.includes(term) ||
          normalizeSearch(cou?.iso_code)?.includes(term)
      );
    }

    //shipping filtering
    if (shipping) {
      const term = normalizeSearch(shipping);
      services = services.filter((ship) =>
        normalizeSearch(ship?.name)?.includes(term)
      );
    }

    //language filtering
    if (language) {
      const term = normalizeSearch(language);
      services = services.filter(
        (lan) =>
          normalizeSearch(lan.name)?.includes(term) ||
          normalizeSearch(lan.iso_code)?.includes(term) ||
          normalizeSearch(lan.language_code)?.includes(term)
      );
    }

    if (currency) {
      const term = normalizeSearch(currency);
      services = services.filter((cur) =>
        normalizeSearch(cur.iso_code)?.includes(term)
      );
    }

    //generic column sorting (used by sortable table headers, e.g. staff table)
    if (sortColumn) {
      const getSortValue = (item) => {
        if (sortColumn === "role") {
          const names = roleOptions.length
            ? resolveRoleNames(item?.role, roleOptions)
            : normalizeRoleValue(item?.role);
          return (names[0] || "").toLowerCase();
        }

        const raw = item?.[sortColumn];

        if (raw && typeof raw === "object") {
          return (raw[lang] || raw["en"] || "").toLowerCase();
        }
        if (sortColumn === "joiningData") {
          return raw ? new Date(raw).getTime() : 0;
        }

        return typeof raw === "string" ? raw.toLowerCase() : raw ?? "";
      };

      services = [...services].sort((a, b) => {
        const aVal = getSortValue(a);
        const bVal = getSortValue(b);

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return services;
  }, [
    time,
    data,
    location.pathname,
    filter,
    sortedField,
    searchText,
    attributeTitle,
    categoryType,
    role,
    roleOptions,
    sortColumn,
    sortDirection,
    searchUser,
    searchCoupon,
    status,
    searchOrder,
    country,
    shipping,
    language,
    currency,
    categoryRef,
    globalSetting?.default_time_zone,
    lang,
  ]);

  //dashboard order stats (pending/processing/delivered/today/monthly/total)
  useEffect(() => {
    if (location.pathname !== "/dashboard") {
      return;
    }

    const services = (Array.isArray(data) ? data : []).map((el) => {
    const newDate = new Date(el?.updatedAt).toLocaleString("en-US", {
      timeZone: globalSetting?.default_time_zone || "UTC",
    });
      return {
        ...el,
        updatedDate: newDate === "Invalid Date" ? "" : newDate,
      };
    });

    setPending(services?.filter((statusP) => statusP.status === "Pending"));
    setProcessing(
      services?.filter((statusO) => statusO.status === "Processing")
    );
    setDelivered(
      services?.filter((statusD) => statusD.status === "Delivered")
    );

    //daily total order calculation
    const todayServices = services?.filter((order) =>
      dayjs(order.createdAt).isToday()
    );
    setTodayOrder(
      todayServices?.reduce(
        (preValue, currentValue) => preValue + currentValue.total,
        0
      )
    );

    //monthly order calculation
    const monthlyServices = services?.filter((order) =>
      dayjs(order.createdAt).isBetween(
        new Date().setDate(new Date().getDate() - 30),
        new Date()
      )
    );
    setMonthlyOrder(
      monthlyServices?.reduce(
        (preValue, currentValue) => preValue + currentValue.total,
        0
      )
    );

    //total order calculation
    setTotalOrder(
      services?.reduce(
        (preValue, currentValue) => preValue + currentValue.total,
        0
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, location.pathname, globalSetting?.default_time_zone]);

  //generic column sort toggle for sortable table headers
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  //pagination functionality start
  const resultsPerPage = DEFAULT_PAGE_SIZE;
  const totalResults = serviceData?.length;
  const handleChangePage = (p) => {
    setCurrentPage(p);
  };
  useEffect(() => {
    const nextTable = serviceData?.slice(
      (currentPage - 1) * resultsPerPage,
      currentPage * resultsPerPage
    );

    setDataTable((prevTable) => {
      if (
        Array.isArray(prevTable) &&
        Array.isArray(nextTable) &&
        prevTable.length === nextTable.length &&
        prevTable.every((item, index) => item === nextTable[index])
      ) {
        return prevTable;
      }
      return nextTable;
    });
  }, [serviceData, currentPage]);
  //pagination functionality end
  //table form submit function for search start
  const handleSubmitForAll = (e) => {
    e.preventDefault();
    setSearchText(searchRef.current.value);
  };
  const handleSubmitUser = (e) => {
    e.preventDefault();
    setSearchUser(userRef.current.value);
  };
  const handleSubmitCoupon = (e) => {
    e.preventDefault();
    setSearchCoupon(couponRef.current.value);
  };
  const handleSubmitOrder = (e) => {
    e.preventDefault();
    setSearchOrder(orderRef.current.value);
  };
  const handleSubmitCategory = (e) => {
    e.preventDefault();
    setCategoryType(categoryRef.current.value);
  };
  const handleSubmitAttribute = (e) => {
    e.preventDefault();
    setAttributeTitle(attributeRef.current.value);
  };

  const handleSubmitCountry = (e) => {
    e.preventDefault();
    setCountry(countryRef.current.value);
  };

  const handleSubmitShipping = (e) => {
    e.preventDefault();
    setShipping(shippingRef.current.value);
  };
  const handleSubmitLanguage = (e) => {
    e.preventDefault();
    setLanguage(languageRef.current.value);
  };
  const handleSubmitCurrency = (e) => {
    e.preventDefault();
    setCurrency(currencyRef.current.value);
  };
  // table form submit function for search end
  // handle submit multiple product data with csv format
  const handleOnDrop = (data) => {
    for (let i = 0; i < data.length; i++) {
      newProducts.push(data[i].data);
    }
  };
  const handleUploadProducts = () => {
    if (newProducts.length < 1) {
      notifyError("Please upload/select csv file first!");
    } else {
      if (handleDisableForDemo()) {
        return; // Exit the function if the feature is disabled
      }
      ProductServices.addAllProducts(newProducts)
        .then((res) => {
          notifySuccess(res.message);
        })
        .catch((err) => notifyError(err.message));
    }
  };
  const handleSelectFile = (e) => {
    e.preventDefault();
    if (handleDisableForDemo()) {
      return; // Exit the function if the feature is disabled
    }

    const fileReader = new FileReader();
    const file = e.target?.files[0];

    if (file && file.type === "application/json") {
      setFileName(file?.name);
      setIsDisable(true);

      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = (e) => {
        let text = JSON.parse(e.target.result);

        let data = [];
        if (location.pathname === "/categories") {
          data = text.map((value) => {
            return {
              _id: value._id,
              status: value.status,
              name: value.name,
              slug: value.slug,
              parentId: value.parentId || null,
            };
          });
        }
        if (location.pathname === "/attributes") {
          data = text.map((value) => {
            return {
              _id: value._id,
              name: value.name,
              slug: value.slug,
              description: value.description,
              isVariation: value.isVariation,
            };
          });
        }

        if (location.pathname === "/coupons") {
          data = text.map((value) => {
            return {
              title: value.title,
              couponCode: value.couponCode,
              endTime: value.endTime,
              discountPercentage: value.discountPercentage,
              minimumAmount: value.minimumAmount,
              productType: value.productType,
              logo: value.logo,
              discountType: value.discountType,
              status: value.status,
            };
          });
        }
        if (location.pathname === "/customers") {
          data = text.map((value) => {
            return {
              name: value.name,
              email: value.email,
              password: value.password,
              phone: value.phone,
            };
          });
        }
        setSelectedFile(data);
      };
    } else if (file && file.type === "text/csv") {
      setFileName(file?.name);
      setIsDisable(true);

      fileReader.onload = async (event) => {
        const text = event.target.result;
        const json = await csvToJson().fromString(text);
        let data = [];

        if (location.pathname === "/categories") {
          data = json.map((value) => {
            return {
              _id: value._id,
              status: value.status,
              // a plain string now, so no JSON.parse round-trip
              name: value.name,
              slug: value.slug,
              parentId: value.parentId || null,
            };
          });
        }
        if (location.pathname === "/attributes") {
          data = json.map((value) => {
            return {
              name: value.name,
              slug: value.slug,
              description: value.description,
              isVariation: value.isVariation === "true" || value.isVariation === true,
            };
          });
        }

        if (location.pathname === "/coupons") {
          const invalidRows = [];
          data = json.map((value, index) => {
            try {
              return {
                title: typeof value.title === "string" ? JSON.parse(value.title) : value.title,
                couponCode: value.couponCode,
                endTime: value.endTime,
                discountPercentage: value.discountPercentage
                  ? JSON.parse(value.discountPercentage)
                  : 0,
                minimumAmount: value.minimumAmount
                  ? JSON.parse(value.minimumAmount)
                  : 0,
                productType: value.productType,
                logo: value.logo,
                status: value.status,
              };
            } catch (err) {
              invalidRows.push({ line: index + 2, message: `Invalid coupon data: ${err.message}` });
              return null;
            }
          }).filter(Boolean);
          if (invalidRows.length > 0) {
            notifyError(`${invalidRows.length} coupon row(s) skipped  see console for details.`);
            console.warn("Invalid CSV rows:", invalidRows);
          }
        }
        if (location.pathname === "/customers") {
          data = json.map((value) => {
            return {
              name: value.name,
              email: value.email,
              password: value.password,
              phone: value.phone,
            };
          });
        }
        setSelectedFile(data);
      };
      fileReader.readAsText(file);
    } else {
      setFileName(file?.name);
      setIsDisable(true);

      notifyError("Unsupported file type!");
    }
  };

  const handleUploadMultiple = (e) => {
    if (handleDisableForDemo()) {
      return; // Exit the function if the feature is disabled
    }

    if (selectedFile.length > 1) {
      if (location.pathname === "/categories") {
        setLoading(true);
        let categoryDataValidation = selectedFile.map((value) =>
          ajv.validate(categorySchema, value)
        );

        const isBelowThreshold = (currentValue) => currentValue === true;
        const validationData = categoryDataValidation.every(isBelowThreshold);

        if (validationData) {
          ProductCategoryServices.addAllCategories(selectedFile)
            .then((res) => {
              setLoading(false);
              setIsUpdate(true);
              notifySuccess(res.message);
            })
            .catch((err) => {
              setLoading(false);
              notifyError(err ? err.response.data.message : err.message);
            });
        } else {
          notifyError("Please enter valid data!");
        }
      }
      if (location.pathname === "/customers") {
        setLoading(true);
        let customerDataValidation = selectedFile.map((value) =>
          ajv.validate(customerSchema, value)
        );

        const isBelowThreshold = (currentValue) => currentValue === true;
        const validationData = customerDataValidation.every(isBelowThreshold);

        if (validationData) {
          CustomerServices.addAllCustomers(selectedFile)
            .then((res) => {
              setLoading(false);
              setIsUpdate(true);
              notifySuccess(res.message);
            })
            .catch((err) => {
              setLoading(false);
              notifyError(err ? err.response.data.message : err.message);
            });
        } else {
          notifyError("Please enter valid data!");
        }
      }
      if (location.pathname === "/coupons") {
        setLoading(true);
        let attributeDataValidation = selectedFile.map((value) =>
          ajv.validate(couponSchema, value)
        );

        const isBelowThreshold = (currentValue) => currentValue === true;
        const validationData = attributeDataValidation.every(isBelowThreshold);

        if (validationData) {
          CouponServices.addAllCoupon(selectedFile)
            .then((res) => {
              setLoading(false);
              setIsUpdate(true);
              notifySuccess(res.message);
            })
            .catch((err) => {
              setLoading(false);
              notifyError(err ? err.response.data.message : err.message);
            });
        } else {
          notifyError("Please enter valid data!");
        }
      }
      if (location.pathname === "/attributes") {
        setLoading(true);
        let attributeDataValidation = selectedFile.map((value) =>
          ajv.validate(attributeSchema, value)
        );

        const isBelowThreshold = (currentValue) => currentValue === true;
        const validationData = attributeDataValidation.every(isBelowThreshold);

        if (validationData) {
          AttributeServices.addAllAttributes(selectedFile)
            .then((res) => {
              setLoading(false);
              setIsUpdate(true);
              notifySuccess(res.message);
            })
            .catch((err) => {
              setLoading(false);
              notifyError(err ? err.response.data.message : err.message);
            });
        } else {
          notifyError("Please enter valid data!");
        }
      }

      if (location.pathname === "/currencies") {
        CurrencyServices.addAllCurrency(selectedFile)
          .then((res) => {
            setIsUpdate(true);
            notifySuccess(res.message);
          })
          .catch((err) =>
            notifyError(err ? err.response.data.message : err.message)
          );
      }
    } else {
      notifyError("Please select a valid .JSON/.CSV/.XLS file first!");
    }
  };

  const handleRemoveSelectFile = (e) => {
    setFileName("");
    setSelectedFile([]);
    setTimeout(() => setIsDisable(false), 1000);
  };

  return {
    handleSort,
    sortColumn,
    sortDirection,
    userRef,
    searchRef,
    couponRef,
    orderRef,
    categoryRef,
    attributeRef,
    pending,
    processing,
    delivered,
    todayOrder,
    monthlyOrder,
    totalOrder,
    setFilter,
    setSortedField,
    setStatus,
    setRole,
    time,
    zone,
    setTime,
    taxRef,
    setZone,
    filename,
    countryRef,
    dataTable,
    serviceData,
    country,
    setSearchText,
    setCountry,
    isDisabled,
    languageRef,
    currencyRef,
    shippingRef,
    setSearchUser,
    setDataTable,
    setCategoryType,
    handleChangePage,
    totalResults,
    resultsPerPage,
    handleOnDrop,
    setSearchCoupon,
    setAttributeTitle,
    handleSelectFile,
    handleSubmitUser,
    handleSubmitForAll,
    handleSubmitCoupon,
    handleSubmitOrder,
    handleSubmitCategory,
    handleSubmitAttribute,
    handleUploadProducts,
    handleSubmitCountry,
    handleSubmitCurrency,
    handleSubmitShipping,
    handleSubmitLanguage,
    handleUploadMultiple,
    handleRemoveSelectFile,
  };
};

export default useFilter;

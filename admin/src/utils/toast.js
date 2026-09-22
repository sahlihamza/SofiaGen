import { toast } from "react-toastify";

const defaultConfig = {
  position: "top-center",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

const notifySuccess = (message, config = {}) =>
  toast.success(message, { ...defaultConfig, ...config });

const notifyError = (message, config = {}) =>
  toast.error(message, { ...defaultConfig, ...config });

const notifyInfo = (message, config = {}) =>
  toast.info(message, { ...defaultConfig, ...config });

const notifyWarning = (message, config = {}) =>
  toast.warn(message, { ...defaultConfig, ...config });

export { notifySuccess, notifyError, notifyInfo, notifyWarning };
export { defaultConfig };
export default { notifySuccess, notifyError, notifyInfo, notifyWarning };

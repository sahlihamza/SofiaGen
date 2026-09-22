import { useMemo } from "react";
import Multiselect from "multiselect-react-dropdown";

// Generic "pick some documents by _id" multi-select. `options` is the full
// reference list ({_id, label}), `selectedIds` is the plain id array the
// caller persists; this component only handles the id <-> option-object
// translation multiselect-react-dropdown needs for its `selectedValues` prop.
const IdMultiSelect = ({ options = [], selectedIds = [], onChange, placeholder }) => {
  const selectedValues = useMemo(
    () => options.filter((option) => selectedIds.includes(option._id)),
    [options, selectedIds]
  );

  const handleChange = (selectedList) => {
    onChange(selectedList.map((item) => item._id));
  };

  // Explicit colors instead of relying on the app's `.dark` CSS cascade:
  // this drawer is rendered through rc-drawer's portal (appended straight to
  // document.body), which can sit outside the themed ancestor the global
  // dark-mode selectors target  so the library's default (black-on-dark)
  // input text silently becomes unreadable there.
  const style = {
    searchBox: {
      backgroundColor: "#24262d",
      borderColor: "#4c4f52",
      color: "#ebebeb",
      minHeight: "48px",
    },
    inputField: {
      color: "#ebebeb",
    },
    chips: {
      background: "#2f855a",
    },
    optionContainer: {
      backgroundColor: "#24262d",
      color: "#ebebeb",
    },
    option: {
      color: "#ebebeb",
    },
  };

  return (
    <Multiselect
      options={options}
      selectedValues={selectedValues}
      displayValue="label"
      isObject={true}
      onSelect={handleChange}
      onRemove={handleChange}
      placeholder={placeholder}
      showCheckbox={true}
      avoidHighlightFirstOption={true}
      style={style}
    />
  );
};

export default IdMultiSelect;

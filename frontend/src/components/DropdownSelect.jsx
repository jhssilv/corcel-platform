"use client"

import Select from "react-select"
import PropTypes from "prop-types"

// GRADES FILTER COMPONENT \\   

// Dropdown select configurations

const DropdownSelect = ({title, options, onChange, selectedValues, isMulti=false, filterOption=null, inputValue, onInputChange}) => {
  // Handle changes in the select input
  const handleChange = (selectedOptions) => {
    onChange(selectedOptions)
  }

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: "#1a1a1a",
      borderColor: state.isFocused ? "#646cff" : "#3a3a3a",
      borderRadius: "8px",
      padding: "2px",
      boxShadow: state.isFocused ? "0 0 0 1px #646cff" : "none",
      "&:hover": {
        borderColor: "#646cff",
      },
      cursor: "pointer",
      transition: "all 0.2s ease",
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: "#1a1a1a",
      borderRadius: "8px",
      border: "1px solid #3a3a3a",
      marginTop: "4px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
    }),
    menuList: (provided) => ({
      ...provided,
      padding: "4px",
      maxHeight: "300px",
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? "#646cff" : state.isFocused ? "#2a2a2a" : "transparent",
      color: state.isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.87)",
      padding: "10px 12px",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "all 0.15s ease",
      "&:active": {
        backgroundColor: "#535bf2",
      },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "rgba(255, 255, 255, 0.5)",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "rgba(255, 255, 255, 0.87)",
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: "#646cff",
      borderRadius: "4px",
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: "#ffffff",
      padding: "2px 6px",
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: "#ffffff",
      cursor: "pointer",
      "&:hover": {
        backgroundColor: "#535bf2",
        color: "#ffffff",
      },
    }),
    input: (provided) => ({
      ...provided,
      color: "rgba(255, 255, 255, 0.87)",
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: "#3a3a3a",
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: state.isFocused ? "#646cff" : "rgba(255, 255, 255, 0.5)",
      "&:hover": {
        color: "#646cff",
      },
      transition: "all 0.2s ease",
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: "rgba(255, 255, 255, 0.5)",
      "&:hover": {
        color: "#646cff",
      },
    }),
  }

  return (
    <Select
      styles={customStyles}
      value={selectedValues}
      onChange={handleChange}
      options={options}
      placeholder={title}
      isMulti={isMulti}
      closeMenuOnSelect={!isMulti}
      filterOption={filterOption}
      inputValue={inputValue}
      onInputChange={onInputChange}
    />
  )
}

DropdownSelect.propTypes = {
  title: PropTypes.string,
  options: PropTypes.array,
  selectedValues: PropTypes.any,
  onChange: PropTypes.func,
  isMulti: PropTypes.bool,
  filterOption: PropTypes.func,
  inputValue: PropTypes.string,
  onInputChange: PropTypes.func,
}

export default DropdownSelect

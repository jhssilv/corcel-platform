"use client"

import Select from "react-select"
import PropTypes from "prop-types"
import "../styles/dropdown_select.css"

// GRADES FILTER COMPONENT \\   

// Dropdown select configurations

const DropdownSelect = ({title, options, onChange, selectedValues, isMulti=false, filterOption=null, inputValue, onInputChange, ...props}) => {
  // Handle changes in the select input
  const handleChange = (selectedOptions) => {
    onChange(selectedOptions)
  }

  return (
    <Select
      classNamePrefix="react-select"
      value={selectedValues}
      onChange={handleChange}
      options={options}
      placeholder={title}
      isMulti={isMulti}
      closeMenuOnSelect={!isMulti}
      filterOption={filterOption}
      inputValue={inputValue}
      onInputChange={onInputChange}
      {...props}
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

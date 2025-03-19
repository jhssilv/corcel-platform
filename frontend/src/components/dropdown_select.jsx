import Select from 'react-select';
import PropTypes from 'prop-types';


// GRADES FILTER COMPONENT \\

// Dropdown select configurations

const DropdownSelect = ({title, options, onChange, selectedValues, isMulti=false}) => {
    // Handle changes in the select input
    const handleChange = (selectedOptions) => {
        onChange(selectedOptions);
    };

    return (
        <Select
        theme={(theme) => ({
            ...theme,
            borderRadius: 3,
            colors: {
                ...theme.colors,
                primary: '#272829',       // Main color (used for selected option background, border, etc.)
                primary25: '#61677A',     // Hover background color for options
                primary50: '#D8D9DA',     // Background color for focused options
                primary75: '#61677A',     // Background color for active options
                danger: '#ff0000',        // Error color (optional)
                dangerLight: '#ffcccc',   // Light error color (optional)
                neutral0: '#272829',      // Background color of the select component
                neutral5: '#61677A',      // Light background color (optional)
                neutral10: '#61677A',     // Light background color (optional)
                neutral20: '#61677A',     // Border color before the select is focused
                neutral30: '#61677A',     // Border color on hover
                neutral40: '#61677A',     // Border color when focused or active
                neutral50: '#D8D9DA',     // Placeholder text color
                neutral60: '#FFF6E0',     // Dropdown arrow and icons color
                neutral70: '#61677A',     // Lighter color for disabled states
                neutral80: '#FFF6E0',     // Main text color
                neutral90: '#FFF6E0',     // Darker color for emphasized text
            },
          })}
            value={selectedValues}
            onChange={handleChange}
            options={options}
            placeholder={title}
            isMulti={isMulti}
            closeMenuOnSelect={!isMulti}
        />
    );
};

DropdownSelect.propTypes = {
    title: PropTypes.string,
    options: PropTypes.array,
    selectedValues: PropTypes.any,
    onChange: PropTypes.func,
    isMulti: PropTypes.bool,
};

export default DropdownSelect;
import React from "react";
import PropTypes from "prop-types";

const Input = ({
  label,
  type,
  id,
  name,
  options,
  placeholder,
  value,
  onChange,
  disabled,
}) => (
  <div className="input-container">
    <label htmlFor={id}>{label}</label>
    {type === "select" ? (
      <select id={id} name={name} value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {options?.map((option) => (
          <option key={option?.id} value={option?.id}>
            {option?.name}
          </option>
        ))}
      </select>
    ) : (
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    )}
  </div>
);

Input.propTypes = {
  label: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  options: PropTypes.array,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
};

export default Input;

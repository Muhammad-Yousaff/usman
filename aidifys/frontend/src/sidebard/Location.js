import React from 'react'
import InputField from '../components/InputField'

const Location = ({ handleChange }) => {
    return (
        <div className="ml-4">
            <h4 className='text-lg font-medium mb-2 hidden sm:block'>Location</h4>
            <div>
                <label className='sidebar-label-container'>
                    <input type="radio" name="test" id="test" value="" onChange={handleChange} />
                    <span className='checkmark'></span> ALL
                </label>
                <InputField
                    handleChange={handleChange}
                    value="karachi"
                    title="Karachi"
                    name="test" />
                <InputField
                    handleChange={handleChange}
                    value="lahore"
                    title="Lahore"
                    name="test" />
                <InputField
                    handleChange={handleChange}
                    value="islamabad"
                    title="Islamabad"
                    name="test" />
                <InputField
                    handleChange={handleChange}
                    value="rawalpindi"
                    title="Rawalpindi"
                    name="test" />
                <InputField
                    handleChange={handleChange}
                    value="faisalabad"
                    title="Faisalabad"
                    name="test" />
                <InputField
                    handleChange={handleChange}
                    value="multan"
                    title="Multan"
                    name="test" />
                <InputField
                    handleChange={handleChange}
                    value="peshawar"
                    title="Peshawar"
                    name="test" />
            </div>
        </div>
    )
}

export default Location;

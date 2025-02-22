// src/components/playground/SettingsSidebar.tsx
import React, { useState } from 'react';
import Select from 'react-select';
import { usePdfContext } from '../../contexts/PdfContext';
import '../../styles/playground/SettingsSidebar.css';

interface OptionType {
    value: string;
    label: string;
}

// Mock options for ML & AI
const mlOptions: OptionType[] = [
    { value: 'name', label: 'Name' },
    { value: 'phone', label: 'Phone' },
    { value: 'email', label: 'Email' },
    { value: 'address', label: 'Address' },
    { value: 'id', label: 'ID Number' },
];

const aiOptions: OptionType[] = [
    { value: 'name', label: 'Name' },
    { value: 'phone', label: 'Phone' },
    { value: 'email', label: 'Email' },
    { value: 'address', label: 'Address' },
    { value: 'id', label: 'ID Number' },
    { value: 'health', label: 'Health' },
    { value: 'economic', label: 'Economic' },
    { value: 'sexual', label: 'Sexual' },
    { value: 'religious', label: 'Religious' },
];

const SettingsSidebar: React.FC = () => {
    const {
        highlightColor,
        setHighlightColor,
        searchQueries,
        setSearchQueries,
        selectedMlEntities,
        setSelectedMlEntities,
        selectedAiEntities,
        setSelectedAiEntities,
    } = usePdfContext();

    // Local state for the input box for new search
    const [tempSearchTerm, setTempSearchTerm] = useState('');

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHighlightColor(e.target.value);
    };

    // Update local input state
    const handleTempSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempSearchTerm(e.target.value);
    };

    // Add the new search term to the array
    const addSearchTerm = () => {
        if (tempSearchTerm.trim()) {
            // Add new search query to the array
            setSearchQueries([...searchQueries, tempSearchTerm]);
            setTempSearchTerm('');
            console.log('Added search term:', tempSearchTerm);
        }
    };

    // Remove a search term from the array
    const removeSearchTerm = (term: string) => {
        const newArr = searchQueries.filter((t: String ) => t !== term);
        setSearchQueries(newArr);
        console.log('Removed search term:', term);
    };

    // Entities apply
    const applyEntitiesOptions = () => {
        console.log('Apply ML Entities:', selectedMlEntities);
        console.log('Apply AI Entities:', selectedAiEntities);
    };

    // Redact
    const redactDocument = () => {
        console.log('Redact document with current settings');
    };

    return (
        <div className="settings-sidebar-container">
            <h3>Settings</h3>

            {/* Search Field */}
            <div className="settings-block">
                <label htmlFor="pdf-search">Search (Regex supported, multiple terms):</label>
                <div className="search-input-container">
                    <input
                        id="pdf-search"
                        type="text"
                        value={tempSearchTerm}
                        onChange={handleTempSearchChange}
                        placeholder="Enter search pattern..."
                        className="settings-input search-input"
                    />

                    <button
                        className="search-icon-button"
                        onClick={addSearchTerm}
                    >
                        {/* Magnifying glass icon */}
                        <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="icon"
                            viewBox="0 0 24 24"
                        >
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                    </button>
                </div>

                {/* Display current search terms */}
                <div className="search-terms-list">
                    {searchQueries.map((term:  string ) => (
                        <div key={term} className="search-term-item">
                            <span>{term}</span>
                            <button
                                className="search-term-remove"
                                onClick={() => removeSearchTerm(term)}
                            >
                                x
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Entities (ML) Multi-select */}
            <div className="settings-block">
                <label>Entities (ML):</label>
                <Select
                    isMulti
                    options={mlOptions}
                    value={selectedMlEntities}
                    onChange={(options) => setSelectedMlEntities(options as OptionType[])}
                    placeholder="Select ML Entities..."
                    closeMenuOnSelect={false}
                />
            </div>

            {/* Entities (AI) Multi-select */}
            <div className="settings-block">
                <label>Entities (AI):</label>
                <Select
                    isMulti
                    options={aiOptions}
                    value={selectedAiEntities}
                    onChange={(options) => setSelectedAiEntities(options as OptionType[])}
                    placeholder="Select AI Entities..."
                    closeMenuOnSelect={false}
                />
            </div>

            <div className="settings-block button-group">
                <button onClick={applyEntitiesOptions} className="apply-button">
                    Apply Entities Options
                </button>
            </div>

            {/* Highlight Color */}
            <div className="settings-block">
                <label htmlFor="highlight-color">Highlight Color</label>
                <input
                    id="highlight-color"
                    type="color"
                    value={highlightColor}
                    onChange={handleColorChange}
                    className="settings-input"
                />
            </div>

            <div className="settings-block button-group">
                <button onClick={redactDocument} className="redact-button">
                    Redact
                </button>
            </div>
        </div>
    );
};

export default SettingsSidebar;

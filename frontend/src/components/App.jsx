import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import Inventory from './components/Inventory';
import ProcessedFiles from './components/ProcessedFiles';
import Settings from './components/Settings';
import UploadSales from './components/UploadSales';  // New component
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return <FileUpload setIsProcessing={setIsProcessing} />;
      case 'inventory':
        return <Inventory />;
      case 'files':
        return <ProcessedFiles />;
      case 'settings':
        return <Settings />;
      case 'sales':
        return <UploadSales setIsProcessing={setIsProcessing} />;  // New sales upload tab
      default:
        return <FileUpload setIsProcessing={setIsProcessing} />;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src="/logo.png" alt="Company Logo" className="logo" />
        <h1>XseLLer8 by TECHS IN THE CITY</h1>
        <nav>
          <button onClick={() => setActiveTab('upload')}>Upload Invoice</button>
          <button onClick={() => setActiveTab('inventory')}>Inventory</button>
          <button onClick={() => setActiveTab('files')}>Processed Files</button>
          <button onClick={() => setActiveTab('sales')}>Upload Sales</button>  {/* New button */}
          <button onClick={() => setActiveTab('settings')}>Settings</button>
        </nav>
      </header>
      <main>
        {isProcessing ? <div className="loading-spinner"></div> : renderTabContent()}
      </main>
    </div>
  );
}

export default App;
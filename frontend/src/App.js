import './App.css';
import React, { useState } from 'react';
import FileUpload from './components/FileUpload.jsx';
import CostTracking from './components/CostTracking.jsx';
import Inventory from './components/Inventory.jsx';
import Forecasting from './components/Forecasting.jsx';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [activeTab, setActiveTab] = useState('fileUpload');
  const [invoices, setInvoices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);

  const handleFileUpload = (parsedData) => {
    setInvoices([...invoices, ...parsedData]);
    updateInventory(parsedData);
    updateCostTracking(parsedData);
    // Trigger success notification
    toast.success('File uploaded successfully!');
  };

  const updateInventory = (invoiceData) => {
    const updatedInventory = invoiceData.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));
    setInventory([...inventory, ...updatedInventory]);
  };

  const updateCostTracking = (invoiceData) => {
    const totalCost = invoiceData.reduce((acc, item) => acc + item.price * item.quantity, 0);
    setSales([...sales, { month: new Date().getMonth(), cost: totalCost }]);
  };

  const renderContent = () => {
    return (
      <div className="content-container">
        {activeTab === 'fileUpload' && <FileUpload onFileUpload={handleFileUpload} />}
        {activeTab === 'costTracking' && <CostTracking invoices={invoices} />}
        {activeTab === 'inventory' && <Inventory inventory={inventory} />}
        {activeTab === 'forecasting' && <Forecasting sales={sales} />}
      </div>
    );
  };

  return (
    <div className="App">
      {/* Background */}
      <div className="background"></div>

      {/* Logo in the top right corner */}
      <img src={`${process.env.PUBLIC_URL}/TECHS IN THE CITY.png`} alt="Corner Logo" className="corner-logo" />

      <aside className="sidebar">
        <h1>XseLLer8</h1>
        <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="XseLLer8 Logo" className="logo" />
        <nav>
          <button className={activeTab === 'fileUpload' ? 'active' : ''} onClick={() => setActiveTab('fileUpload')}>
            Upload Invoice
          </button>
          <button className={activeTab === 'costTracking' ? 'active' : ''} onClick={() => setActiveTab('costTracking')}>
            Cost Tracking
          </button>
          <button className={activeTab === 'inventory' ? 'active' : ''} onClick={() => setActiveTab('inventory')}>
            Inventory
          </button>
          <button className={activeTab === 'forecasting' ? 'active' : ''} onClick={() => setActiveTab('forecasting')}>
            Forecasting
          </button>
        </nav>
      </aside>
      <main className="content-area">
        {renderContent()}
      </main>
      
      {/* Toast notification container */}
      <ToastContainer 
        position="top-right" 
        autoClose={5000} 
        hideProgressBar={false} 
        closeOnClick 
        pauseOnHover 
        draggable 
      />
    </div>
  );
}

export default App;

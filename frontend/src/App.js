import './App.css';
import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import CostTracking from './components/CostTracking';
import Inventory from './components/Inventory';
import Forecasting from './components/Forecasting';

function App() {
  const [invoices, setInvoices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);

  const handleFileUpload = (parsedData) => {
    setInvoices([...invoices, ...parsedData]);
    updateInventory(parsedData);
    updateCostTracking(parsedData);
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

  return (
    <div className="App">
      <header className="App-header">
        <img src="/logo.png" alt="Logo" className="logo" />
        <h1>XseLLer8 by TECHS IN THE CITY</h1>
        <nav>
          <button onClick={() => window.scrollTo(0, document.body.scrollHeight)}>Upload Invoice</button>
          <button>Inventory</button>
          <button>Processed Files</button>
          <button>Upload Sales</button>
          <button>Settings</button>
        </nav>
      </header>
      <main>
        <div className="content-wrapper">
          <FileUpload onFileUpload={handleFileUpload} />
          <CostTracking invoices={invoices} />
          <Inventory inventory={inventory} />
          <Forecasting sales={sales} />
        </div>
      </main>
    </div>
  );
}

export default App;

import './App.css';
import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import CostTracking from './components/CostTracking';
import Inventory from './components/Inventory';
import Forecasting from './components/Forecasting';

function App() {
  const [invoices, setInvoices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);

  const handleFileUpload = (parsedData) => {
    // Handle parsed data from FileUpload component (invoices)
    setInvoices([...invoices, ...parsedData]);
    // Update inventory and cost tracking based on invoices
    updateInventory(parsedData);
    updateCostTracking(parsedData);
  };

  const updateInventory = (invoiceData) => {
    // Update inventory based on invoice data
    const updatedInventory = invoiceData.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));
    setInventory([...inventory, ...updatedInventory]);
  };

  const updateCostTracking = (invoiceData) => {
    // Log costs and update sales data based on invoices
    const totalCost = invoiceData.reduce((acc, item) => acc + item.price * item.quantity, 0);
    setSales([...sales, { month: new Date().getMonth(), cost: totalCost }]);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>XseLLer8 by TECHS IN THE CITY</h1>
      </header>
      <main>
        <FileUpload onFileUpload={handleFileUpload} />
        <CostTracking invoices={invoices} />
        <Inventory inventory={inventory} />
        <Forecasting sales={sales} />
      </main>
    </div>
  );
}

export default App;

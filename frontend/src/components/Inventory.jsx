import React, { useState, useEffect } from 'react';

const Inventory = () => {
  const [inventoryData, setInventoryData] = useState([]);

  useEffect(() => {
    // Fetch the inventory data from the backend API
    async function fetchData() {
      try {
        const response = await fetch('http://localhost:5000/inventory');  // API route to fetch data
        if (!response.ok) {
          throw new Error(`Failed to fetch inventory: ${response.statusText}`);
        }
        const data = await response.json();
        setInventoryData(Object.entries(data));  // Convert JSON object to array for easier rendering
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      }
    }

    fetchData();
  }, []);  // Only fetch once on component mount

  return (
    <div className="inventory">
      <h2>Inventory Data</h2>
      {inventoryData.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {inventoryData.map(([id, item]) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{item['ITEM NAME']}</td>
                <td>${item.PRICE.toFixed(2)}</td>
                <td>{item.ORDERED}</td>
                <td>{item.STATUS}</td>
                <td>{new Date(item.lastUpdated).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No inventory data available.</p>
      )}
    </div>
  );
};

export default Inventory;

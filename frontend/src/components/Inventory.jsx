// Example of fetching JSON data and displaying it in a table in React
import React, { useState, useEffect } from 'react';

const Inventory = () => {
  const [inventoryData, setInventoryData] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch('http://localhost:5000/inventory');  // Replace with your API route
      const data = await response.json();
      setInventoryData(Object.entries(data));  // Convert JSON object to array
    }

    fetchData();
  }, []);

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
              <th>Category</th>
              <th>Quantity</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {inventoryData.map(([id, item]) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{item.name}</td>
                <td>{item.price}</td>
                <td>{item.category}</td>
                <td>{item.quantity}</td>
                <td>{item.date}</td>
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

import React from 'react';

const CostTracking = ({ invoices }) => {
  const totalCost = invoices.reduce((acc, item) => {
    if (item.quantity > 0 && item.price > 0) {
      return acc + item.price * item.quantity;
    }
    return acc;
  }, 0);

  return (
    <div>
      <h2>Cost Tracking</h2>
      <p>Total Costs: ${totalCost.toFixed(2)}</p>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice, index) => (
            <tr key={index}>
              <td>{invoice.name}</td>
              <td>{invoice.quantity}</td>
              <td>${invoice.price > 0 ? invoice.price.toFixed(2) : 'Invalid'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CostTracking;

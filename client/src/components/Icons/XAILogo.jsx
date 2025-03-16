import React from 'react';

const XAILogo = ({ sx = {} }) => (
  <img 
    src={process.env.PUBLIC_URL + '/xai-logo.png'} // Updated path
    alt="XAI Logo"
    style={{
      width: sx.fontSize || '24px',
      height: sx.fontSize || '24px',
      objectFit: 'contain', // Added to maintain aspect ratio
      filter: 'none !important', // Prevent color inversion in dark mode
      ...sx
    }}
  />
);

export default XAILogo; 
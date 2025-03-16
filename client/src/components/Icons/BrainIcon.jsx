import React from 'react';
import SvgIcon from '@mui/material/SvgIcon';

const BrainIcon = (props) => (
  <SvgIcon 
    {...props} 
    viewBox="0 0 24 24"
    sx={{ 
      filter: 'none !important',
      ...props.sx 
    }}
  >
    <path
      d="M12 3C7.5 3 4.5 5.5 4.5 9.5C4.5 11.5 5.5 13.2 7 14.2C7 14.4 6.9 14.7 6.7 15C6.5 15.3 6.2 15.7 6 16C5.8 16.3 5.5 16.7 5.3 17C5.1 17.3 5 17.7 5 18C5 19.7 6.3 21 8 21H16C17.7 21 19 19.7 19 18C19 17.7 18.9 17.3 18.7 17C18.5 16.7 18.2 16.3 18 16C17.8 15.7 17.5 15.3 17.3 15C17.1 14.7 17 14.4 17 14.2C18.5 13.2 19.5 11.5 19.5 9.5C19.5 5.5 16.5 3 12 3Z"
      fill="#FF9E9E"
      stroke="#1A237E"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 3C10.5 3 9.5 4 9.5 5.5C9.5 7 10.5 8 12 8C13.5 8 14.5 7 14.5 5.5C14.5 4 13.5 3 12 3Z"
      fill="#FF9E9E"
      stroke="#1A237E"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

export default BrainIcon; 
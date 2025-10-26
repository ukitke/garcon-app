import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

describe('App', () => {
  it('renders correctly', () => {
    const { getByText } = render(<App />);
    
    expect(getByText('Garçon')).toBeTruthy();
    expect(getByText('Digital Restaurant Service Platform')).toBeTruthy();
    expect(getByText(/Welcome to Garçon/)).toBeTruthy();
  });

  it('displays feature description', () => {
    const { getByText } = render(<App />);
    
    expect(getByText(/order food, call waiters, and pay your bill/)).toBeTruthy();
  });
});
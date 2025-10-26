import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App';
import { store } from './store';

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          {component}
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
};

describe('App', () => {
  it('renders dashboard with title', () => {
    renderWithProviders(<App />);
    
    expect(screen.getByText('Garçon Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Digital Restaurant Service Platform')).toBeInTheDocument();
  });

  it('displays features list', () => {
    renderWithProviders(<App />);
    
    expect(screen.getByText('Features Coming Soon:')).toBeInTheDocument();
    expect(screen.getByText('Menu Management')).toBeInTheDocument();
    expect(screen.getByText('Order Tracking')).toBeInTheDocument();
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
  });
});
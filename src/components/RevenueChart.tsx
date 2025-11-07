import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../services/api';
import './RevenueChart.css';

interface DailyRevenue {
  date: string;
  revenue: number;
  formattedDate: string;
}

interface RevenueChartProps {
  maxValue?: number;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ maxValue = 1200000 }) => {
  const [revenueData, setRevenueData] = useState<DailyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate last 7 days dates
  const getLast7Days = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true);
        const dates = getLast7Days();
        const revenuePromises = dates.map(async (date) => {
          const data = await dashboardApi.getData(date, date);
          return {
            date,
            revenue: data.summary.totalRevenue || 0,
            formattedDate: formatDateForDisplay(date)
          };
        });
        
        const results = await Promise.all(revenuePromises);
        setRevenueData(results);
        setError(null);
      } catch (err) {
        setError('Failed to fetch revenue data');
        console.error('Revenue chart error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, []);

  const refetchData = async () => {
    try {
      setLoading(true);
      const dates = getLast7Days();
      const revenuePromises = dates.map(async (date) => {
        const data = await dashboardApi.getData(date, date);
        return {
          date,
          revenue: data.summary.totalRevenue || 0,
          formattedDate: formatDateForDisplay(date)
        };
      });
      
      const results = await Promise.all(revenuePromises);
      setRevenueData(results);
      setError(null);
    } catch (err) {
      setError('Failed to fetch revenue data');
      console.error('Revenue chart error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate bar heights as percentage
  const getBarHeight = (revenue: number) => {
    const percentage = (revenue / maxValue) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    } else {
      return `₹${amount}`;
    }
  };

  if (loading) {
    return (
      <div className="revenue-chart-container">
        <div className="chart-header">
          <h3>📊 Revenue Trend - Last 7 Days</h3>
        </div>
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <p>Loading revenue data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="revenue-chart-container">
        <div className="chart-header">
          <h3>📊 Revenue Trend - Last 7 Days</h3>
        </div>
        <div className="chart-error">
          <p>{error}</p>
          <button className="retry-btn" onClick={refetchData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0);
  const averageRevenue = totalRevenue / revenueData.length;
  const maxDayRevenue = Math.max(...revenueData.map(day => day.revenue));
  const minDayRevenue = Math.min(...revenueData.map(day => day.revenue));

  return (
    <div className="revenue-chart-container">
      <div className="chart-header">
        <div className="chart-title">
          <h3>📊 Revenue Trend - Last 7 Days</h3>
          <p className="chart-subtitle">Daily revenue comparison with ₹{(maxValue / 100000).toFixed(1)}L maximum scale</p>
        </div>
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{formatCurrency(totalRevenue)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg</span>
            <span className="stat-value">{formatCurrency(averageRevenue)}</span>
          </div>
        </div>
      </div>

      <div className="chart-content">
        {/* Y-axis labels */}
        <div className="y-axis">
          <div className="y-label y-max">₹{(maxValue / 100000).toFixed(1)}L</div>
          <div className="y-label y-75">₹{(maxValue * 0.75 / 100000).toFixed(1)}L</div>
          <div className="y-label y-50">₹{(maxValue * 0.5 / 100000).toFixed(1)}L</div>
          <div className="y-label y-25">₹{(maxValue * 0.25 / 100000).toFixed(1)}L</div>
          <div className="y-label y-min">₹0</div>
        </div>

        {/* Chart area */}
        <div className="chart-area">
          {/* Grid lines */}
          <div className="grid-lines">
            <div className="grid-line" style={{ bottom: '100%' }}></div>
            <div className="grid-line" style={{ bottom: '75%' }}></div>
            <div className="grid-line" style={{ bottom: '50%' }}></div>
            <div className="grid-line" style={{ bottom: '25%' }}></div>
            <div className="grid-line" style={{ bottom: '0%' }}></div>
          </div>

          {/* Bars */}
          <div className="bars-container">
            {revenueData.map((day, index) => {
              const barHeight = getBarHeight(day.revenue);
              const isToday = day.formattedDate === 'Today';
              const isHighest = day.revenue === maxDayRevenue;
              const isLowest = day.revenue === minDayRevenue && day.revenue < averageRevenue;
              
              return (
                <div key={day.date} className="bar-wrapper">
                  <div className="bar-container">
                    <div 
                      className={`revenue-bar ${isToday ? 'today' : ''} ${isHighest ? 'highest' : ''} ${isLowest ? 'lowest' : ''}`}
                      style={{ height: `${barHeight}%` }}
                      title={`${day.formattedDate}: ${formatCurrency(day.revenue)}`}
                    >
                      <div className="bar-value">
                        {day.revenue > 0 ? formatCurrency(day.revenue) : '₹0'}
                      </div>
                    </div>
                  </div>
                  <div className="bar-label">
                    <span className={`date-label ${isToday ? 'today' : ''}`}>
                      {day.formattedDate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart insights */}
      <div className="chart-insights">
        <div className="insight-item">
          <span className="insight-icon">🏆</span>
          <span className="insight-text">
            Best day: {revenueData.find(d => d.revenue === maxDayRevenue)?.formattedDate} 
            ({formatCurrency(maxDayRevenue)})
          </span>
        </div>
        {minDayRevenue < averageRevenue && (
          <div className="insight-item">
            <span className="insight-icon">📉</span>
            <span className="insight-text">
              Lowest day: {revenueData.find(d => d.revenue === minDayRevenue)?.formattedDate} 
              ({formatCurrency(minDayRevenue)})
            </span>
          </div>
        )}
        <div className="insight-item">
          <span className="insight-icon">📈</span>
          <span className="insight-text">
            Trend: {totalRevenue > averageRevenue * 7 ? 'Above average week' : 'Below average week'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
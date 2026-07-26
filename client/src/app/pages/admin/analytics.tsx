import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { DollarSign, Users, Activity, Star, Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { useAnalytics } from "../../../lib/analyticsApi";

const COLORS = ['#781216', '#a43238', '#cf666a', '#e8a1a3', '#fca5a5'];
const REVENUE_COLOR = "#10b981"; // emerald 500
const COST_COLOR = "#ef4444"; // red 500
const CASHFLOW_COLOR = "#3b82f6"; // blue 500

export default function Analytics() {
  const [timeframe, setTimeframe] = useState("1M");
  
  const { data: currentData, isLoading, error } = useAnalytics(timeframe);

  const calculateKPIs = () => {
    if (!currentData) {
       return { rev: "$0", cash: "$0", trav: "0", rate: "0.0", p_rev: "", p_cash: "", p_trav: "", p_rate: "0" };
    }

    const totalRev = currentData.revenueVsCost.reduce((sum, item) => sum + item.revenue, 0);
    const totalCost = currentData.revenueVsCost.reduce((sum, item) => sum + item.cost, 0);
    const netCash = totalRev - totalCost;
    
    const totalNewTrav = currentData.travelers.reduce((sum, item) => sum + item.new, 0);
    const totalRetTrav = currentData.travelers.reduce((sum, item) => sum + item.returning, 0);
    const totalTrav = totalNewTrav + totalRetTrav;

    const validRatings = currentData.ratings.filter(r => r.rating > 0);
    const avgRating = validRatings.length > 0 
      ? (validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length).toFixed(1)
      : "0.0";

    const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    
    return {
      rev: formatCurrency(totalRev),
      cash: (netCash > 0 ? "+" : "") + formatCurrency(netCash),
      trav: totalTrav.toLocaleString(),
      rate: avgRating,
      p_rev: "For selected period",
      p_cash: "For selected period",
      p_trav: `${totalNewTrav} new`,
      p_rate: "Selected period"
    };
  };

  const kpis = calculateKPIs();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Monitor your business metrics and growth trends.
          </p>
        </div>

        <div className="flex bg-muted p-1 rounded-md w-full sm:w-auto">
          <button
            onClick={() => setTimeframe("1M")}
            className={`flex-1 sm:px-4 py-1.5 text-sm font-medium rounded-sm transition-all ${timeframe === "1M" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50"}`}
          >
            1 Month
          </button>
          <button
            onClick={() => setTimeframe("6M")}
            className={`flex-1 sm:px-4 py-1.5 text-sm font-medium rounded-sm transition-all ${timeframe === "6M" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50"}`}
          >
            6 Months
          </button>
          <button
            onClick={() => setTimeframe("1Y")}
            className={`flex-1 sm:px-4 py-1.5 text-sm font-medium rounded-sm transition-all ${timeframe === "1Y" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50"}`}
          >
            1 Year
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          Failed to load analytics data.
        </div>
      ) : !currentData ? null : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.rev}</div>
                <p className="text-xs text-muted-foreground">
                  {kpis.p_rev}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cashflow</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${kpis.cash.startsWith('-') ? 'text-red-600' : 'text-emerald-600'}`}>{kpis.cash}</div>
                <p className="text-xs text-muted-foreground">
                  {kpis.p_cash}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Travelers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.trav}</div>
                <p className="text-xs text-muted-foreground">
                  {kpis.p_trav} this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.rate}</div>
                <p className="text-xs text-muted-foreground">
                  {kpis.p_rate}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Revenue vs. Operating Costs</CardTitle>
                <CardDescription>Financial performance over {timeframe === '1M' ? 'the last month' : timeframe === '6M' ? 'the last 6 months' : 'the last year'}</CardDescription>
              </CardHeader>
              <CardContent className="pl-2 h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData.revenueVsCost} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={REVENUE_COLOR} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={REVENUE_COLOR} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COST_COLOR} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COST_COLOR} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip 
                      formatter={(value) => [`$${(value as number).toLocaleString()}`, undefined]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke={REVENUE_COLOR} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="cost" name="Operating Cost" stroke={COST_COLOR} fillOpacity={1} fill="url(#colorCost)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Distribution of operating expenses</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] flex items-center justify-center pb-8">
                {currentData.costBreakdown.length === 0 ? (
                  <div className="text-muted-foreground text-sm">No expenses recorded</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentData.costBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {currentData.costBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`$${(value as number).toLocaleString()}`, undefined]} 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Net Cashflow</CardTitle>
                <CardDescription>Monthly net income</CardDescription>
              </CardHeader>
              <CardContent className="pl-0 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentData.cashflow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6'}}
                      formatter={(value) => [`$${(value as number).toLocaleString()}`, 'Cashflow']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="amount" fill={CASHFLOW_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Traveler Growth</CardTitle>
                <CardDescription>New vs Returning travelers</CardDescription>
              </CardHeader>
              <CardContent className="pl-0 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentData.travelers} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6'}}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="new" name="New" stackId="a" fill="#781216" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="returning" name="Returning" stackId="a" fill="#e8a1a3" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Customer Satisfaction</CardTitle>
                <CardDescription>Average review rating trend</CardDescription>
              </CardHeader>
              <CardContent className="pl-0 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentData.ratings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                    <Tooltip 
                      formatter={(value) => [`${value} Stars`, 'Avg Rating']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="rating" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

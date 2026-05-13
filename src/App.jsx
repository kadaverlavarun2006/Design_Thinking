import React, { useState, useEffect } from 'react';
import {
  Thermometer,
  Droplets,
  Sprout,
  Wifi,
  Settings,
  Activity,
  History,
  Info,
  Database,
  Bell,
  Cpu,
  RefreshCw,
  MoreVertical
} from 'lucide-react';

// --- Internal Components ---

const Gauge = ({ value, label, unit, color, icon: Icon, max = 100 }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(value / max, 0), 1);
  const strokeDashoffset = circumference * (1 - (percentage * 0.75));

  return (
    <div className="bg-white border border-gray-200 rounded-md p-5 flex flex-col items-center justify-center min-w-[200px] flex-1 shadow-sm transition-all hover:shadow-md">
      <div className="w-full flex justify-between items-center mb-4">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        {Icon && <Icon size={14} className="text-gray-300" />}
      </div>

      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-225">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            stroke="#f3f4f6"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="text-2xl font-black text-gray-800 tracking-tighter">{value.toFixed(2)}</span>
          <span className="text-[10px] font-bold text-gray-400">{unit}</span>
        </div>
      </div>
    </div>
  );
};

const ControlCard = ({ label, active, onToggle, icon: Icon }) => (
  <div className="bg-white border border-gray-200 rounded-md p-4 flex items-center justify-between shadow-sm flex-1 min-w-[220px] transition-all">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded transition-all duration-300 ${active ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-50' : 'bg-gray-50 text-gray-400'}`}>
        {Icon && <Icon size={18} className={active ? "animate-pulse" : ""} />}
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter leading-none mb-1">{label}</p>
        <p className={`text-xs font-black uppercase transition-colors duration-300 ${active ? 'text-gray-800' : 'text-gray-300'}`}>
          {active ? 'Active ON' : 'Standby OFF'}
        </p>
      </div>
    </div>
    <button
      onClick={onToggle}
      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 focus:outline-none ${active ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${active ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

// --- Main Application ---

export default function App() {
  const [sensors, setSensors] = useState({
    temp: 29.20,
    humidity: 80.50,
    moisture: 100
  });

  const [controls, setControls] = useState({
    pump: false,
    tempControl: true,
    humidifier: false
  });

  const [reward, setReward] = useState(0);
  const [cumulativeReward, setCumulativeReward] = useState(0);
  const [agentStatus, setAgentStatus] = useState("Initializing Agent...");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeTab, setActiveTab] = useState('Dashboard');

  // --- RL Agent Logic ---
  // The agent aims to keep Temp (22-26), Humidity (60-75), and Moisture (45-60)
  useEffect(() => {
    const runAgent = () => {
      let currentReward = 0;
      let actionTaken = "Optimizing parameters...";

      // 1. Evaluate Temperature
      if (sensors.temp > 27) {
        setControls(prev => ({ ...prev, tempControl: true }));
        actionTaken = "Cooling Active";
        currentReward -= 1;
      } else if (sensors.temp < 24) {
        setControls(prev => ({ ...prev, tempControl: false })); // Turn off cooling when comfortable
        currentReward += 2;
      } else {
        currentReward += 1;
      }

      // 2. Evaluate Humidity
      if (sensors.humidity < 65) {
        setControls(prev => ({ ...prev, humidifier: true }));
        actionTaken = "Increasing Humidity";
        currentReward -= 1;
      } else if (sensors.humidity > 75) {
        setControls(prev => ({ ...prev, humidifier: false })); // Turn off when target reached
        currentReward += 2;
      } else {
        currentReward += 1;
      }

      // 3. Evaluate Soil Moisture
      if (sensors.moisture < 50) {
        setControls(prev => ({ ...prev, pump: true }));
        actionTaken = "Irrigation Active";
        currentReward -= 1;
      } else if (sensors.moisture > 65) {
        setControls(prev => ({ ...prev, pump: false })); // Turn off when saturated enough
        currentReward += 2;
      } else {
        currentReward += 1;
      }

      setReward(currentReward);
      setCumulativeReward(prev => prev + currentReward);
      setAgentStatus(actionTaken);
    };

    const agentInterval = setInterval(runAgent, 3000);
    return () => clearInterval(agentInterval);
  }, [sensors]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSensors(prev => {
        // Environment naturally drifts (Stronger drift to trigger ON conditions)
        let nextTemp = prev.temp + (Math.random() * 0.6 - 0.2); // Naturally warms up
        let nextHumid = prev.humidity + (Math.random() * 0.4 - 0.6); // Naturally dries out
        let nextMoist = prev.moisture - 0.4; // Dries out faster

        // Controls affect environment
        if (controls.tempControl) nextTemp -= 0.8; // Cooling is effective
        if (controls.humidifier) nextHumid += 1.2; // Humidifying is effective
        if (controls.pump) nextMoist += 2.5; // Irrigation is very effective

        return {
          temp: +Math.max(15, Math.min(45, nextTemp)).toFixed(2),
          humidity: +Math.max(0, Math.min(100, nextHumid)).toFixed(2),
          moisture: +Math.max(0, Math.min(100, nextMoist)).toFixed(2)
        };
      });
      setLastUpdated(new Date());
    }, 3000);
    return () => clearInterval(interval);
  }, [controls]);

  const toggleControl = (key) => setControls(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-blue-100">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white shadow-sm">
            <Cpu size={20} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-gray-800 uppercase tracking-tight leading-none">Reinforcement Learning Based Greenhouse Climate Controller</h1>
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-[10px] font-bold text-emerald-600 rounded border border-emerald-100 uppercase">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Industrial Monitoring System</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {['Dashboard', 'Timeline', 'Device Info', 'Metadata', 'Actions Log'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all rounded ${activeTab === tab
                ? 'bg-gray-100 text-blue-600 shadow-inner'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-gray-600 relative">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <div className="h-6 w-px bg-gray-200 mx-2" />
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-blue-100 text-blue-600 font-black rounded-full flex items-center justify-center text-[10px]">JD</div>
            <span className="text-[10px] font-bold text-gray-600 hidden sm:block uppercase">Administrator</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto flex flex-col gap-8">

        {/* Status Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-gray-200 rounded-md shadow-sm">
            <div className="flex items-center gap-6">
              <StatusIndicator label="ESP32" active={true} icon={Wifi} />
              <StatusIndicator label="Sensor" active={true} icon={Activity} />
              <StatusIndicator label="Agent" active={true} icon={Cpu} />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-full">
              <RefreshCw size={10} className="animate-spin-slow" />
              Last Updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>

          <div className="bg-blue-600 p-4 border border-blue-700 rounded-md shadow-sm text-white flex flex-col justify-between">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-80">RL Agent Performance</span>
              <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/20 ${reward >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                {reward >= 0 ? '+' : ''}{reward} Pts
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-medium opacity-60 uppercase leading-none mb-1">Cumulative Reward</p>
                <p className="text-xl font-black tracking-tight">{cumulativeReward}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium opacity-60 uppercase leading-none mb-1">Current Action</p>
                <p className="text-[11px] font-black uppercase tracking-tighter truncate max-w-[120px]">{agentStatus}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Monitoring Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={14} className="text-blue-600" /> Live Telemetry
            </h2>
            <button className="text-gray-300 hover:text-gray-500">
              <MoreVertical size={16} />
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <Gauge
              value={sensors.temp}
              label="Temperature"
              unit="°C"
              color="#ea580c"
              icon={Thermometer}
              max={50}
            />
            <Gauge
              value={sensors.humidity}
              label="Humidity"
              unit="%"
              color="#dc2626"
              icon={Droplets}
            />
            <Gauge
              value={sensors.moisture}
              label="Soil Moisture"
              unit="%"
              color="#2563eb"
              icon={Sprout}
            />
          </div>
        </section>

        {/* Controls Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Settings size={14} className="text-gray-500" /> Device Controls
            </h2>
          </div>

          <div className="flex flex-wrap gap-4">
            <ControlCard
              label="Pump Button"
              active={controls.pump}
              onToggle={() => toggleControl('pump')}
              icon={Droplets}
            />
            <ControlCard
              label="Temp Control Button"
              active={controls.tempControl}
              onToggle={() => toggleControl('tempControl')}
              icon={Thermometer}
            />
            <ControlCard
              label="Humidifier Switch"
              active={controls.humidifier}
              onToggle={() => toggleControl('humidifier')}
              icon={Droplets}
            />
          </div>
        </section>

        {/* System Info Section (Example) */}
        <section className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Info size={14} /> System Metadata
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <MetaItem label="Uptime" value="12d 4h 32m" />
            <MetaItem label="IP Address" value="192.168.1.104" />
            <MetaItem label="Storage" value="78% Used" />
            <MetaItem label="Firmware" value="v2.4.1-stable" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t border-gray-200 p-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span>&copy; 2026 Smart Agriculture Solutions</span>
            <div className="w-1 h-1 bg-gray-200 rounded-full" />
            <span className="flex items-center gap-1"><Database size={10} /> Local Persistence: Active</span>
          </div>
          <div className="flex gap-6 text-[10px] font-bold text-gray-300 uppercase tracking-tighter">
            <a href="#" className="hover:text-blue-500 transition-colors">Documentation</a>
            <a href="#" className="hover:text-blue-500 transition-colors">API Keys</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const StatusIndicator = ({ label, active, icon: Icon }) => (
  <div className="flex items-center gap-2">
    <div className={`p-1.5 rounded ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-300'}`}>
      <Icon size={12} />
    </div>
    <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-gray-700' : 'text-gray-300'}`}>
      {label}
    </span>
    <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
  </div>
);

const MetaItem = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</span>
    <span className="text-xs font-black text-gray-700 uppercase tracking-tight">{value}</span>
  </div>
);

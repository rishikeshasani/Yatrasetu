import React, { useState } from 'react';
import { getShrineImage } from '../utils/shrineImages';

const TELEMETRY_SHRINES = {
  Main: {
    siteId: 'SITE001',
    name: 'Main Temple',
    location: 'Bhubaneswar, Odisha',
    image: getShrineImage('SITE001'),
    alt: 'Main Temple Visual Telemetry, Bhubaneswar, Odisha',
    camId: 'CAM-HD-01',
    headcount: '184',
    headcountSub: 'People in Sanctum',
    occupancy: '10%',
    occupancyStatus: 'Normal / Smooth',
    wait: '20 mins',
    waitSub: 'Standard Queues Flowing',
    capacity: '1,000',
    capacitySub: 'Threshold Monitored'
  },
  Heritage: {
    siteId: 'TS007',
    name: 'Heritage Shrine (Puri)',
    location: 'Puri, Odisha',
    image: getShrineImage('TS007'),
    alt: 'Heritage Shrine Visual Telemetry, Puri, Odisha',
    camId: 'CAM-HD-02',
    headcount: '348',
    headcountSub: 'People in Sanctum',
    occupancy: '35%',
    occupancyStatus: 'Normal / Smooth',
    wait: '20 mins',
    waitSub: 'Standard Queues Flowing',
    capacity: '1,000',
    capacitySub: 'Threshold Monitored'
  },
  Kedarnath: {
    siteId: 'TS001',
    name: 'Kedarnath Temple',
    location: 'Rudraprayag, Uttarakhand',
    image: getShrineImage('TS001'),
    alt: 'Kedarnath Temple Visual Telemetry, Rudraprayag, Uttarakhand',
    camId: 'CAM-HD-04',
    headcount: '120',
    headcountSub: 'People in Sanctum',
    occupancy: '1%',
    occupancyStatus: 'Normal / Smooth',
    wait: '35 mins',
    waitSub: 'Fast-Track Queues Active',
    capacity: '13,000',
    capacitySub: 'Threshold Monitored'
  },
  Badrinath: {
    siteId: 'TS002',
    name: 'Badrinath Temple',
    location: 'Chamoli, Uttarakhand',
    image: getShrineImage('TS002'),
    alt: 'Badrinath Temple Visual Telemetry, Chamoli, Uttarakhand',
    camId: 'CAM-HD-03',
    headcount: '1,280',
    headcountSub: 'People in Sanctum',
    occupancy: '8%',
    occupancyStatus: 'Normal / Smooth',
    wait: '20 mins',
    waitSub: 'Fast-Track Queues Active',
    capacity: '16,000',
    capacitySub: 'Threshold Monitored'
  },
  Kashi: {
    siteId: 'TS003',
    name: 'Kashi Vishwanath Temple',
    location: 'Varanasi, Uttar Pradesh',
    image: getShrineImage('TS003'),
    alt: 'Kashi Vishwanath Temple Visual Telemetry, Varanasi, Uttar Pradesh',
    camId: 'CAM-HD-05',
    headcount: '10,500',
    headcountSub: 'Corridor & Sanctum',
    occupancy: '42%',
    occupancyStatus: 'Normal / Smooth',
    wait: '25 mins',
    waitSub: 'Fast-Track Queues Active',
    capacity: '25,000',
    capacitySub: 'Threshold Monitored'
  }
};

export default function LiveVisionTelemetry({ onInspectConsole }) {
  const [selectedKey, setSelectedKey] = useState('Kedarnath');
  const shrine = TELEMETRY_SHRINES[selectedKey] || TELEMETRY_SHRINES.Kedarnath;

  return (
    <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200/80 shadow-lg p-5 font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
            Live Vision Telemetry
          </span>
        </div>
        <span className="text-[11px] font-mono font-medium text-slate-400 tracking-wide">
          {shrine.camId}
        </span>
      </div>

      {/* Shrine Selector Tabs */}
      <div className="flex items-center gap-1.5 py-3 overflow-x-auto scrollbar-none">
        {Object.keys(TELEMETRY_SHRINES).map((key) => {
          const isSelected = selectedKey === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedKey(key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Live Vision Camera View with Real Temple Photo */}
      <div className="relative h-56 w-full rounded-2xl overflow-hidden bg-slate-950 shadow-inner">
        <img
          src={shrine.image}
          alt={shrine.alt}
          className="w-full h-full object-cover transition-opacity duration-300"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = getShrineImage(shrine.siteId || 'TS001');
          }}
        />

        {/* Subtle dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-black/20 pointer-events-none" />

        {/* Bottom-Left Information Overlay */}
        <div className="absolute bottom-3.5 left-4 right-4 pointer-events-none">
          <h4 className="text-base font-bold text-white tracking-wide drop-shadow-md">
            {shrine.name}
          </h4>
          <p className="text-xs font-medium text-slate-200 flex items-center gap-1 mt-0.5 drop-shadow">
            <span>📍</span>
            <span>{shrine.location}</span>
          </p>
        </div>
      </div>

      {/* 2x2 Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {/* Metric 1: Headcount */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Current Headcount
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {shrine.headcount}
          </div>
          <div className="text-[10.5px] text-slate-500 font-medium mt-0.5">
            {shrine.headcountSub}
          </div>
        </div>

        {/* Metric 2: Occupancy Level */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Occupancy Level
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-extrabold text-slate-900">
              {shrine.occupancy}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
              {shrine.occupancyStatus}
            </span>
          </div>
        </div>

        {/* Metric 3: Estimated Wait */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Estimated Wait
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {shrine.wait}
          </div>
          <div className="text-[10.5px] text-slate-500 font-medium mt-0.5">
            {shrine.waitSub}
          </div>
        </div>

        {/* Metric 4: Safe Max Capacity */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Safe Max Capacity
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {shrine.capacity}
          </div>
          <div className="text-[10.5px] text-slate-500 font-medium mt-0.5">
            {shrine.capacitySub}
          </div>
        </div>
      </div>

      {/* Footer CTA Button */}
      <div className="mt-4 pt-1">
        <button
          onClick={onInspectConsole}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1.5 transition-all shadow-md"
        >
          <span>Inspect in Live Pilgrim Console</span>
          <span className="text-sm">→</span>
        </button>
      </div>
    </div>
  );
}

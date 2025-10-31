import React, { useState, useMemo } from 'react';
import { Upload, AlertCircle, CheckCircle, Copy, ChevronDown, ChevronRight, ArrowUpDown, Lightbulb } from 'lucide-react';
import * as XLSX from 'xlsx';

const PLXCrescentCompare = () => {
  const [plxData, setPlxData] = useState(null);
  const [crescentData, setCrescentData] = useState(null);
  const [editedCrescentRows, setEditedCrescentRows] = useState([]);
  const [editedPlxRows, setEditedPlxRows] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedShift, setSelectedShift] = useState('1st Shift');
  const [plxFile, setPlxFile] = useState(null);
  const [crescentFile, setCrescentFile] = useState(null);
  const [shift1TotalRow, setShift1TotalRow] = useState(null);
  const [mismatchNotes, setMismatchNotes] = useState({});
  const [crescentErrors, setCrescentErrors] = useState(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [comparisonCollapsed, setComparisonCollapsed] = useState(true);
  const [crescentCollapsed, setCrescentCollapsed] = useState(true);
  const [plxCollapsed, setPlxCollapsed] = useState(true);
  const [crescentSort, setCrescentSort] = useState({ column: 'EID', direction: 'asc' });
  const [plxSort, setPlxSort] = useState({ column: 'EID', direction: 'asc' });

  // Parse PLX Excel file
  const parsePLXFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const dayRow = jsonData[3] || [];
        const hourTypeRow = jsonData[4] || [];

        const columnMapping = {};
        let currentDay = '';
        
        dayRow.forEach((cell, idx) => {
          if (cell && typeof cell === 'string' && cell.trim()) {
            currentDay = cell.trim();
          }
          if (currentDay && hourTypeRow[idx]) {
            const hourType = hourTypeRow[idx].toString().trim();
            if (hourType.includes('Reg') || hourType.includes('OT') || hourType.includes('DT')) {
              columnMapping[idx] = { day: currentDay, hourType };
            }
          }
        });

        const headerRow = jsonData[4];
        const fileColIdx = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('file'));
        const nameColIdx = headerRow.findIndex(h => h && h.toString().toLowerCase().includes('name'));

        let shift1TotalRowIdx = null;
        for (let i = 5; i < jsonData.length; i++) {
          const cellValue = jsonData[i][2]?.toString().toLowerCase() || '';
          if (cellValue.includes('shift') && cellValue.includes('1') && cellValue.includes('total')) {
            shift1TotalRowIdx = i;
            break;
          }
        }
        setShift1TotalRow(shift1TotalRowIdx);

        const records = [];
        for (let i = 5; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row[fileColIdx]) continue;

          const fileValue = row[fileColIdx].toString();
          const eidMatch = fileValue.match(/\d+/);
          if (!eidMatch) continue;

          const eid = eidMatch[0];
          const name = row[nameColIdx] || '';

          let shift = null;
          if (shift1TotalRowIdx !== null) {
            shift = i < shift1TotalRowIdx ? '1st Shift' : '2nd Shift';
          }

          records.push({
            EID: eid,
            Name: name,
            row: row,
            columnMapping: columnMapping,
            shift: shift,
            department: row[1]?.toString() || '' // Column B is index 1
          });
        }

        setPlxData(records);
      } catch (error) {
        console.error('Error parsing PLX file:', error);
        alert('Error parsing PLX file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Parse Crescent CSV/Excel file
  const parseCrescentFile = (file) => {
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();
    
    reader.onload = (e) => {
      try {
        let jsonData;
        
        if (fileName.endsWith('.csv')) {
          const text = e.target.result;
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          jsonData = lines.slice(1).filter(line => line.trim()).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const obj = {};
            headers.forEach((header, idx) => {
              obj[header] = values[idx] || '';
            });
            return obj;
          });
        } else {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          jsonData = XLSX.utils.sheet_to_json(sheet);
        }

        const aggregated = {};
        jsonData.forEach(row => {
          const badgeKey = Object.keys(row).find(k => k.toLowerCase() === 'badge');
          const hoursKey = Object.keys(row).find(k => k.toLowerCase() === 'payable hours');
          const lineKey = Object.keys(row).find(k => k.toLowerCase() === 'line name');
          const clockInKey = Object.keys(row).find(k => k.toLowerCase() === 'clock in time');
          const clockOutKey = Object.keys(row).find(k => k.toLowerCase() === 'clock out time');
          
          const badge = badgeKey ? row[badgeKey] : '';
          const eidMatch = badge.match(/PLX-(\d+)-/i);
          if (!eidMatch) return;

          const eid = eidMatch[1];
          const hours = parseFloat(hoursKey ? row[hoursKey] : 0) || 0;
          const line = lineKey ? row[lineKey] : '';

          if (!aggregated[eid]) {
            aggregated[eid] = {
              EID: eid,
              Badges: new Set(),
              Lines: new Set(),
              Total_Hours: 0,
              ClockIn: '',
              ClockOut: ''
            };
          }

          aggregated[eid].Badges.add(badge);
          aggregated[eid].Lines.add(line);
          aggregated[eid].Total_Hours += hours;
          if (clockInKey && row[clockInKey]) {
            aggregated[eid].ClockIn = row[clockInKey];
          }
          if (clockOutKey && row[clockOutKey]) {
            aggregated[eid].ClockOut = row[clockOutKey];
          }
        });

        const records = Object.values(aggregated).map(record => ({
          EID: record.EID,
          Badge_Last3: Array.from(record.Badges).map(b => b.slice(-3)).join(', '),
          FullBadges: Array.from(record.Badges).join(', '),
          Lines: Array.from(record.Lines).filter(l => l).join(', '),
          Total_Hours: Math.round(record.Total_Hours * 100) / 100,
          Direct_Hours: 0,
          Indirect_Hours: 0,
          ClockIn: record.ClockIn,
          ClockOut: record.ClockOut
        }));

        // Calculate direct/indirect for Crescent
        records.forEach(record => {
          const lines = record.Lines.toLowerCase();
          if (lines.includes('indirect')) {
            record.Indirect_Hours = record.Total_Hours;
          } else {
            record.Direct_Hours = record.Total_Hours;
          }
        });

        setCrescentData(records);
        setEditedCrescentRows(records.map(r => ({...r})));
      } catch (error) {
        console.error('Error parsing Crescent file:', error);
        alert('Error parsing Crescent file. Please check the format.');
      }
    };

    if (fileName.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  // Calculate PLX hours for selected day and shift
  const plxProcessed = useMemo(() => {
    if (!plxData) return [];

    const aggregated = {};
    const filteredData = plxData.filter(record => record.shift === selectedShift);
    
    filteredData.forEach(record => {
      let totalHours = 0;
      
      Object.entries(record.columnMapping).forEach(([colIdx, info]) => {
        if (info.day === selectedDay) {
          const value = parseFloat(record.row[colIdx]) || 0;
          totalHours += value;
        }
      });

      if (!aggregated[record.EID]) {
        aggregated[record.EID] = {
          EID: record.EID,
          Name: record.Name,
          Total_Hours: 0,
          Direct_Hours: 0,
          Indirect_Hours: 0,
          Department: record.department
        };
      }
      
      aggregated[record.EID].Total_Hours += totalHours;
      
      // Check if indirect (005-251-221) or direct (004-251-211)
      if (record.department.includes('005-251-221')) {
        aggregated[record.EID].Indirect_Hours += totalHours;
      } else if (record.department.includes('004-251-211')) {
        aggregated[record.EID].Direct_Hours += totalHours;
      }
    });

    const baseRows = Object.values(aggregated)
      .filter(record => record.Total_Hours > 0)
      .map(record => ({
        ...record,
        Total_Hours: Math.round(record.Total_Hours * 100) / 100,
        Direct_Hours: Math.round(record.Direct_Hours * 100) / 100,
        Indirect_Hours: Math.round(record.Indirect_Hours * 100) / 100
      }));

    setEditedPlxRows(baseRows.map(r => ({...r})));
    return baseRows;
  }, [plxData, selectedDay, selectedShift]);

  const plxForComparison = useMemo(() => {
    return editedPlxRows.map(row => ({
      ...row,
      Total_Hours: parseFloat(row.Total_Hours) || 0
    }));
  }, [editedPlxRows, refreshTrigger]);

  const crescentProcessed = useMemo(() => {
    if (editedCrescentRows.length === 0) return [];
    return editedCrescentRows.map(record => ({
      ...record,
      Total_Hours: parseFloat(record.Total_Hours) || 0
    }));
  }, [editedCrescentRows, refreshTrigger]);

  // Comparison table
  const comparison = useMemo(() => {
    if (!crescentProcessed.length || !plxForComparison.length) return [];

    const allEIDs = new Set([
      ...crescentProcessed.map(r => r.EID),
      ...plxForComparison.map(r => r.EID)
    ]);

    return Array.from(allEIDs).map(eid => {
      const crescentRecord = crescentProcessed.find(r => r.EID === eid);
      const plxRecord = plxForComparison.find(r => r.EID === eid);

      const crescentHours = crescentRecord?.Total_Hours || 0;
      const plxHours = plxRecord?.Total_Hours || 0;
      const diff = Math.abs(crescentHours - plxHours);

      return {
        EID: eid,
        Name: plxRecord?.Name || '',
        Lines: crescentRecord?.Lines || '',
        FullBadges: crescentRecord?.FullBadges || '',
        Total_Hours_Crescent: crescentHours,
        Total_Hours_PLX: plxHours,
        Status: diff < 0.01 ? 'Match' : 'Mismatch'
      };
    }).sort((a, b) => a.EID.localeCompare(b.EID));
  }, [crescentProcessed, plxForComparison, refreshTrigger]);

  const mismatches = useMemo(() => {
    return comparison.filter(r => r.Status === 'Mismatch');
  }, [comparison]);

  // Smart recommendations
  const recommendations = useMemo(() => {
    const recs = [];
    
    mismatches.forEach(mismatch => {
      // Only look at records missing from one side
      if (mismatch.Total_Hours_Crescent === 0 || mismatch.Total_Hours_PLX === 0) {
        const crescentBadge = mismatch.FullBadges;
        const plxName = mismatch.Name.toLowerCase();
        const crescentEID = mismatch.EID;
        
        // Extract last 3 letters from badge
        const badgeLetters = crescentBadge.match(/[A-Za-z]{3}$/)?.[0]?.toLowerCase() || '';
        
        // Check all PLX records for potential matches
        plxForComparison.forEach(plxRecord => {
          const plxLastName = plxRecord.Name.split(' ').pop()?.toLowerCase() || '';
          const plxEID = plxRecord.EID;
          
          // Skip if EIDs match (already matched)
          if (plxEID === crescentEID) return;
          
          // Check if PLX name contains badge letters
          if (badgeLetters.length === 3 && plxLastName.includes(badgeLetters)) {
            recs.push({
              type: 'Name Match',
              crescentEID: crescentEID,
              crescentBadge: crescentBadge,
              crescentHours: mismatch.Total_Hours_Crescent,
              plxEID: plxEID,
              plxName: plxRecord.Name,
              plxHours: plxRecord.Total_Hours,
              reason: `Badge letters "${badgeLetters.toUpperCase()}" match last name "${plxLastName.toUpperCase()}"`
            });
          }
          
          // Check for EID digit differences (1 digit off)
          if (crescentEID.length === plxEID.length) {
            let diffCount = 0;
            for (let i = 0; i < crescentEID.length; i++) {
              if (crescentEID[i] !== plxEID[i]) diffCount++;
            }
            if (diffCount === 1) {
              recs.push({
                type: 'EID Typo',
                crescentEID: crescentEID,
                crescentBadge: crescentBadge,
                crescentHours: mismatch.Total_Hours_Crescent,
                plxEID: plxEID,
                plxName: plxRecord.Name,
                plxHours: plxRecord.Total_Hours,
                reason: `EID off by 1 digit: ${crescentEID} vs ${plxEID}`
              });
            }
          }
          
          // Check for missing/extra digit - improved pattern matching
          if (Math.abs(crescentEID.length - plxEID.length) === 1) {
            const shorter = crescentEID.length < plxEID.length ? crescentEID : plxEID;
            const longer = crescentEID.length > plxEID.length ? crescentEID : plxEID;
            if (longer.includes(shorter)) {
              recs.push({
                type: 'EID Length',
                crescentEID: crescentEID,
                crescentBadge: crescentBadge,
                crescentHours: mismatch.Total_Hours_Crescent,
                plxEID: plxEID,
                plxName: plxRecord.Name,
                plxHours: plxRecord.Total_Hours,
                reason: `Possible missing/extra digit: ${crescentEID} vs ${plxEID}`
              });
            }
          }
          
          // Check for multiple missing digits (like 189834447 vs 1898447)
          if (Math.abs(crescentEID.length - plxEID.length) >= 2) {
            const shorter = crescentEID.length < plxEID.length ? crescentEID : plxEID;
            const longer = crescentEID.length > plxEID.length ? crescentEID : plxEID;
            
            // Check if shorter is substring of longer
            if (longer.includes(shorter)) {
              recs.push({
                type: 'Multiple Digits',
                crescentEID: crescentEID,
                crescentBadge: crescentBadge,
                crescentHours: mismatch.Total_Hours_Crescent,
                plxEID: plxEID,
                plxName: plxRecord.Name,
                plxHours: plxRecord.Total_Hours,
                reason: `Missing ${Math.abs(crescentEID.length - plxEID.length)} digits: ${crescentEID} vs ${plxEID}`
              });
            }
            
            // Check for similar patterns (like 20684309 vs 206843309 - extra "3")
            let matchCount = 0;
            let j = 0;
            for (let i = 0; i < longer.length && j < shorter.length; i++) {
              if (longer[i] === shorter[j]) {
                matchCount++;
                j++;
              }
            }
            
            // If most digits match in sequence, it's likely a typo
            if (matchCount >= shorter.length - 1 && matchCount >= shorter.length * 0.8) {
              const alreadyAdded = recs.some(r => 
                r.crescentEID === crescentEID && r.plxEID === plxEID
              );
              if (!alreadyAdded) {
                recs.push({
                  type: 'Digit Pattern',
                  crescentEID: crescentEID,
                  crescentBadge: crescentBadge,
                  crescentHours: mismatch.Total_Hours_Crescent,
                  plxEID: plxEID,
                  plxName: plxRecord.Name,
                  plxHours: plxRecord.Total_Hours,
                  reason: `Similar digit pattern detected: ${crescentEID} vs ${plxEID}`
                });
              }
            }
          }
        });
      }
    });
    
    return recs;
  }, [mismatches, plxForComparison]);

  const totalCrescent = useMemo(() => {
    return crescentProcessed.reduce((sum, r) => sum + (parseFloat(r.Total_Hours) || 0), 0);
  }, [crescentProcessed, refreshTrigger]);

  const totalCrescentDirect = useMemo(() => {
    return crescentProcessed.reduce((sum, r) => sum + (parseFloat(r.Direct_Hours) || 0), 0);
  }, [crescentProcessed, refreshTrigger]);

  const totalCrescentIndirect = useMemo(() => {
    return crescentProcessed.reduce((sum, r) => sum + (parseFloat(r.Indirect_Hours) || 0), 0);
  }, [crescentProcessed, refreshTrigger]);

  const totalPLX = useMemo(() => {
    return plxForComparison.reduce((sum, r) => sum + (parseFloat(r.Total_Hours) || 0), 0);
  }, [plxForComparison, refreshTrigger]);

  const totalPLXDirect = useMemo(() => {
    return plxForComparison.reduce((sum, r) => sum + (parseFloat(r.Direct_Hours) || 0), 0);
  }, [plxForComparison, refreshTrigger]);

  const totalPLXIndirect = useMemo(() => {
    return plxForComparison.reduce((sum, r) => sum + (parseFloat(r.Indirect_Hours) || 0), 0);
  }, [plxForComparison, refreshTrigger]);

  const totalDiff = Math.abs(totalCrescent - totalPLX);
  const totalsMatch = totalDiff < 0.01;

  const errorReportText = useMemo(() => {
    const checkedErrors = mismatches.filter(m => crescentErrors.has(m.EID));
    if (checkedErrors.length === 0) return '';

    return checkedErrors.map(row => {
      const badge = row.FullBadges.split(', ')[0] || '';
      return `${row.Name} worked on ${row.Lines} for ${row.Total_Hours_PLX.toFixed(2)} hours (PLX number), not ${row.Total_Hours_Crescent.toFixed(2)} hours (Crescent number) [${badge}]`;
    }).join('\n\n');
  }, [mismatches, crescentErrors]);

  const handleFixRecommendation = (rec) => {
    // Update Crescent EID to match PLX EID
    const updatedRows = editedCrescentRows.map(row => {
      if (row.EID === rec.crescentEID) {
        return {
          ...row,
          EID: rec.plxEID,
          FullBadges: row.FullBadges.replace(
            new RegExp(`PLX-${rec.crescentEID}-`, 'i'),
            `PLX-${rec.plxEID}-`
          ),
          Badge_Last3: row.FullBadges.replace(
            new RegExp(`PLX-${rec.crescentEID}-`, 'i'),
            `PLX-${rec.plxEID}-`
          ).slice(-3)
        };
      }
      return row;
    });
    
    setEditedCrescentRows(updatedRows);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(errorReportText);
    alert('Error report copied to clipboard!');
  };

  const sortCrescentData = (column) => {
    const direction = crescentSort.column === column && crescentSort.direction === 'asc' ? 'desc' : 'asc';
    setCrescentSort({ column, direction });
    
    const sorted = [...editedCrescentRows].sort((a, b) => {
      const aVal = column === 'EID' ? a.EID : a.FullBadges;
      const bVal = column === 'EID' ? b.EID : b.FullBadges;
      return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    setEditedCrescentRows(sorted);
  };

  const sortPlxData = (column) => {
    const direction = plxSort.column === column && plxSort.direction === 'asc' ? 'desc' : 'asc';
    setPlxSort({ column, direction });
    
    const sorted = [...editedPlxRows].sort((a, b) => {
      const aVal = column === 'EID' ? a.EID : a.Name;
      const bVal = column === 'EID' ? b.EID : b.Name;
      return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    setEditedPlxRows(sorted);
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Labor Hours Comparison Tool</h1>
        <p className="text-gray-600">Compare ProLogistix and Crescent reports to identify discrepancies</p>
      </div>

      {/* File Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-blue-300 transition-all">
          <label className="flex items-center justify-center w-full h-36 border-3 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
            <div className="text-center">
              <Upload className="mx-auto mb-3 text-blue-500" size={40} />
              <span className="text-sm font-medium text-gray-700">
                {plxFile ? plxFile.name : 'Upload PLX Report (Excel)'}
              </span>
              <p className="text-xs text-gray-500 mt-1">Click to browse</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setPlxFile(file);
                  parsePLXFile(file);
                }
              }}
            />
          </label>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-indigo-300 transition-all">
          <label className="flex items-center justify-center w-full h-36 border-3 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
            <div className="text-center">
              <Upload className="mx-auto mb-3 text-indigo-500" size={40} />
              <span className="text-sm font-medium text-gray-700">
                {crescentFile ? crescentFile.name : 'Upload Crescent Report (CSV/Excel)'}
              </span>
              <p className="text-xs text-gray-500 mt-1">Click to browse</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setCrescentFile(file);
                  parseCrescentFile(file);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Day and Shift Selection */}
      {plxData && (
        <div className="mb-6 bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Comparison Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day to Compare
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-all"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shift
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-all"
              >
                <option value="1st Shift">1st Shift</option>
                <option value="2nd Shift">2nd Shift</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Refresh Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Totals Summary */}
      {crescentProcessed.length > 0 && editedPlxRows.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Crescent Totals */}
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="bg-white/20 px-3 py-1 rounded">Crescent Totals</span>
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Hours:</span>
                  <span className="text-2xl font-bold">{totalCrescent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm opacity-90">
                  <span>Direct Hours:</span>
                  <span className="text-lg font-semibold">{totalCrescentDirect.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm opacity-90">
                  <span>Indirect Hours:</span>
                  <span className="text-lg font-semibold">{totalCrescentIndirect.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* PLX Totals */}
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="bg-white/20 px-3 py-1 rounded">PLX Totals</span>
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Hours:</span>
                  <span className="text-2xl font-bold">{totalPLX.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm opacity-90">
                  <span>Direct Hours:</span>
                  <span className="text-lg font-semibold">{totalPLXDirect.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm opacity-90">
                  <span>Indirect Hours:</span>
                  <span className="text-lg font-semibold">{totalPLXIndirect.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Match Indicator */}
          <div className="mt-4 flex items-center justify-center gap-3 bg-white/20 px-4 py-3 rounded-lg">
            {totalsMatch ? (
              <>
                <CheckCircle className="text-green-300" size={28} />
                <span className="font-semibold text-lg">Perfect Match!</span>
              </>
            ) : (
              <>
                <AlertCircle className="text-yellow-300" size={28} />
                <div>
                  <div className="font-semibold text-lg">Difference Found</div>
                  <div className="text-sm opacity-90">{totalDiff.toFixed(2)} hours off</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Detail Tables Side by Side */}
      {crescentProcessed.length > 0 && editedPlxRows.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Crescent Detail */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200">
              <button
                onClick={() => setCrescentCollapsed(!crescentCollapsed)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-xl"
              >
                <h2 className="text-xl font-bold text-indigo-700">Crescent Detail</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{editedCrescentRows.length} records</span>
                  {crescentCollapsed ? <ChevronRight size={24} /> : <ChevronDown size={24} />}
                </div>
              </button>
              {!crescentCollapsed && (
                <div className="p-6 pt-0">
                  <div className="flex items-center justify-end mb-4">
                    <button
                      onClick={() => {
                        const newRow = {
                          EID: '',
                          Badge_Last3: '',
                          FullBadges: '',
                          Lines: '',
                          Total_Hours: 0,
                          Direct_Hours: 0,
                          Indirect_Hours: 0,
                          ClockIn: '',
                          ClockOut: ''
                        };
                        setEditedCrescentRows([...editedCrescentRows, newRow]);
                      }}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium shadow-sm transition-all"
                    >
                      + Add Row
                    </button>
                  </div>
                  <div className="overflow-auto max-h-[500px] border-2 border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-indigo-50 sticky top-0">
                        <tr>
                          <th className="p-3 text-left">
                            <button onClick={() => sortCrescentData('EID')} className="flex items-center gap-1 font-semibold hover:text-indigo-600">
                              EID <ArrowUpDown size={14} />
                            </button>
                          </th>
                          <th className="p-3 text-left">
                            <button onClick={() => sortCrescentData('Badge')} className="flex items-center gap-1 font-semibold hover:text-indigo-600">
                              Badge <ArrowUpDown size={14} />
                            </button>
                          </th>
                          <th className="p-3 text-left font-semibold">Lines</th>
                          <th className="p-3 text-right font-semibold">Hours</th>
                          <th className="p-3 text-center font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editedCrescentRows.map((row, idx) => (
                          <tr key={idx} className="border-t border-gray-200 hover:bg-indigo-50/50 transition-colors">
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.EID}
                                onChange={(e) => {
                                  const newRows = [...editedCrescentRows];
                                  newRows[idx].EID = e.target.value;
                                  setEditedCrescentRows(newRows);
                                }}
                                className="w-full border border-gray-300 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.FullBadges}
                                onChange={(e) => {
                                  const newRows = [...editedCrescentRows];
                                  newRows[idx].FullBadges = e.target.value;
                                  newRows[idx].Badge_Last3 = e.target.value.slice(-3);
                                  setEditedCrescentRows(newRows);
                                }}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                                placeholder="PLX-123-ABC"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.Lines}
                                onChange={(e) => {
                                  const newRows = [...editedCrescentRows];
                                  newRows[idx].Lines = e.target.value;
                                  setEditedCrescentRows(newRows);
                                }}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={row.Total_Hours}
                                onChange={(e) => {
                                  const newRows = [...editedCrescentRows];
                                  newRows[idx].Total_Hours = parseFloat(e.target.value) || 0;
                                  setEditedCrescentRows(newRows);
                                }}
                                className="w-24 text-right border border-gray-300 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  const newRows = editedCrescentRows.filter((_, i) => i !== idx);
                                  setEditedCrescentRows(newRows);
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* PLX Detail */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200">
              <button
                onClick={() => setPlxCollapsed(!plxCollapsed)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-xl"
              >
                <h2 className="text-xl font-bold text-blue-700">PLX Detail ({selectedDay} - {selectedShift})</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{editedPlxRows.length} records</span>
                  {plxCollapsed ? <ChevronRight size={24} /> : <ChevronDown size={24} />}
                </div>
              </button>
              {!plxCollapsed && (
                <div className="p-6 pt-0">
                  <div className="flex items-center justify-end mb-4">
                    <button
                      onClick={() => {
                        const newRow = {
                          EID: '',
                          Name: '',
                          Total_Hours: 0,
                          Direct_Hours: 0,
                          Indirect_Hours: 0
                        };
                        setEditedPlxRows([...editedPlxRows, newRow]);
                      }}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium shadow-sm transition-all"
                    >
                      + Add Row
                    </button>
                  </div>
                  <div className="overflow-auto max-h-[500px] border-2 border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-blue-50 sticky top-0">
                        <tr>
                          <th className="p-3 text-left">
                            <button onClick={() => sortPlxData('EID')} className="flex items-center gap-1 font-semibold hover:text-blue-600">
                              EID <ArrowUpDown size={14} />
                            </button>
                          </th>
                          <th className="p-3 text-left">
                            <button onClick={() => sortPlxData('Name')} className="flex items-center gap-1 font-semibold hover:text-blue-600">
                              Name <ArrowUpDown size={14} />
                            </button>
                          </th>
                          <th className="p-3 text-right font-semibold">Hours</th>
                          <th className="p-3 text-center font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editedPlxRows.map((row, idx) => (
                          <tr key={idx} className="border-t border-gray-200 hover:bg-blue-50/50 transition-colors">
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.EID}
                                onChange={(e) => {
                                  const newRows = [...editedPlxRows];
                                  newRows[idx].EID = e.target.value;
                                  setEditedPlxRows(newRows);
                                }}
                                className="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.Name}
                                onChange={(e) => {
                                  const newRows = [...editedPlxRows];
                                  newRows[idx].Name = e.target.value;
                                  setEditedPlxRows(newRows);
                                }}
                                className="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={row.Total_Hours}
                                onChange={(e) => {
                                  const newRows = [...editedPlxRows];
                                  newRows[idx].Total_Hours = parseFloat(e.target.value) || 0;
                                  setEditedPlxRows(newRows);
                                }}
                                className="w-24 text-right border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  const newRows = editedPlxRows.filter((_, i) => i !== idx);
                                  setEditedPlxRows(newRows);
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations Table */}
          {recommendations.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-yellow-200">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="text-yellow-500" size={28} />
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Smart Recommendations</h2>
                  <p className="text-sm text-gray-600">Possible badge matches detected based on names and EID patterns</p>
                </div>
              </div>
              <div className="overflow-auto border-2 border-yellow-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-yellow-50">
                    <tr>
                      <th className="p-3 text-left font-semibold">Type</th>
                      <th className="p-3 text-left font-semibold">Crescent</th>
                      <th className="p-3 text-right font-semibold">C Hours</th>
                      <th className="p-3 text-left font-semibold">PLX</th>
                      <th className="p-3 text-right font-semibold">P Hours</th>
                      <th className="p-3 text-left font-semibold">Reason</th>
                      <th className="p-3 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.map((rec, idx) => (
                      <tr key={idx} className="border-t border-yellow-200 hover:bg-yellow-50/50">
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            rec.type === 'Name Match' ? 'bg-purple-100 text-purple-800' :
                            rec.type === 'EID Typo' ? 'bg-orange-100 text-orange-800' :
                            rec.type === 'Multiple Digits' ? 'bg-pink-100 text-pink-800' :
                            rec.type === 'Digit Pattern' ? 'bg-teal-100 text-teal-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {rec.type}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{rec.crescentEID}</div>
                          <div className="text-xs text-gray-500">{rec.crescentBadge}</div>
                        </td>
                        <td className="p-3 text-right font-medium">{rec.crescentHours.toFixed(2)}</td>
                        <td className="p-3">
                          <div className="font-medium">{rec.plxEID}</div>
                          <div className="text-xs text-gray-500">{rec.plxName}</div>
                        </td>
                        <td className="p-3 text-right font-medium">{rec.plxHours.toFixed(2)}</td>
                        <td className="p-3 text-xs text-gray-600">{rec.reason}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleFixRecommendation(rec)}
                            className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium transition-all"
                          >
                            Fix
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Collapsible Comparison Summary */}
          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200">
            <button
              onClick={() => setComparisonCollapsed(!comparisonCollapsed)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-xl font-bold text-gray-800">Comparison Summary</h2>
              {comparisonCollapsed ? <ChevronRight size={24} /> : <ChevronDown size={24} />}
            </button>
            {!comparisonCollapsed && (
              <div className="p-6 pt-0">
                <div className="overflow-auto border-2 border-gray-200 rounded-lg max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="p-3 text-left font-semibold">EID</th>
                        <th className="p-3 text-left font-semibold">Name</th>
                        <th className="p-3 text-right font-semibold">Crescent</th>
                        <th className="p-3 text-right font-semibold">PLX</th>
                        <th className="p-3 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((row, idx) => (
                        <tr 
                          key={idx} 
                          className={`border-t border-gray-200 hover:bg-gray-50 ${row.Status === 'Mismatch' ? 'bg-red-50' : ''}`}
                        >
                          <td className="p-3">{row.EID}</td>
                          <td className="p-3">{row.Name}</td>
                          <td className="p-3 text-right">{row.Total_Hours_Crescent.toFixed(2)}</td>
                          <td className="p-3 text-right">{row.Total_Hours_PLX.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              row.Status === 'Match' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {row.Status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Mismatches Table */}
          {mismatches.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-red-200">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="text-red-500" size={28} />
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Discrepancies ({mismatches.length})</h2>
                  <p className="text-sm text-gray-600">Review and mark Crescent errors to generate report</p>
                </div>
              </div>
              <div className="overflow-auto border-2 border-red-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="p-3 text-center font-semibold">Crescent Error</th>
                      <th className="p-3 text-left font-semibold">EID</th>
                      <th className="p-3 text-left font-semibold">Name</th>
                      <th className="p-3 text-right font-semibold">Crescent</th>
                      <th className="p-3 text-right font-semibold">PLX</th>
                      <th className="p-3 text-right font-semibold">Diff</th>
                      <th className="p-3 text-left font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mismatches.map((row, idx) => (
                      <tr key={idx} className="border-t border-red-200 hover:bg-red-50/50">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={crescentErrors.has(row.EID)}
                            onChange={(e) => {
                              const newErrors = new Set(crescentErrors);
                              if (e.target.checked) {
                                newErrors.add(row.EID);
                              } else {
                                newErrors.delete(row.EID);
                              }
                              setCrescentErrors(newErrors);
                            }}
                            className="w-5 h-5 cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={row.EID}
                            onChange={(e) => {
                              const oldEID = row.EID;
                              const newEID = e.target.value;
                              
                              // Update Crescent rows - find by matching EID and badge
                              const updatedCrescent = editedCrescentRows.map(r => {
                                if (r.EID === oldEID && row.Total_Hours_Crescent > 0) {
                                  return {
                                    ...r,
                                    EID: newEID,
                                    FullBadges: r.FullBadges.replace(
                                      new RegExp(`PLX-${oldEID}-`, 'i'),
                                      `PLX-${newEID}-`
                                    ),
                                    Badge_Last3: r.FullBadges.replace(
                                      new RegExp(`PLX-${oldEID}-`, 'i'),
                                      `PLX-${newEID}-`
                                    ).slice(-3)
                                  };
                                }
                                return r;
                              });
                              
                              // Update PLX rows
                              const updatedPlx = editedPlxRows.map(r => {
                                if (r.EID === oldEID && row.Total_Hours_PLX > 0) {
                                  return { ...r, EID: newEID };
                                }
                                return r;
                              });
                              
                              setEditedCrescentRows(updatedCrescent);
                              setEditedPlxRows(updatedPlx);
                              
                              // Trigger refresh after a short delay to allow state to update
                              setTimeout(() => setRefreshTrigger(prev => prev + 1), 100);
                            }}
                            className="w-24 border border-gray-300 rounded px-2 py-1 font-medium focus:border-red-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-3">
                          {row.Name || <span className="text-gray-500 italic">{row.FullBadges.match(/[A-Za-z]{3}$/)?.[0] || 'N/A'}</span>}
                        </td>
                        <td className="p-3 text-right font-medium">{row.Total_Hours_Crescent.toFixed(2)}</td>
                        <td className="p-3 text-right font-medium">{row.Total_Hours_PLX.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-red-600">
                          {Math.abs(row.Total_Hours_Crescent - row.Total_Hours_PLX).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={mismatchNotes[row.EID] || ''}
                            onChange={(e) => {
                              setMismatchNotes(prev => ({
                                ...prev,
                                [row.EID]: e.target.value
                              }));
                            }}
                            placeholder="Add notes..."
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-red-500 focus:outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Error Report */}
              {errorReportText && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Copy size={20} />
                      Error Report for Client
                    </h3>
                    <button
                      onClick={handleCopyReport}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-medium shadow-md transition-all"
                    >
                      <Copy size={16} />
                      Copy to Clipboard
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-white p-4 rounded-lg border border-gray-300 max-h-64 overflow-auto">
                    {errorReportText}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PLXCrescentCompare;

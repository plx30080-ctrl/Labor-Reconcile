// Labor Hours Comparison Tool - React Component
const { useState, useMemo } = React;

// Icon components (simplified SVG versions)
const Upload = ({ size = 24, className = "" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
);

const AlertCircle = ({ size = 24, className = "" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const CheckCircle = ({ size = 24, className = "" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const Copy = ({ size = 24, className = "" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const ChevronDown = ({ size = 24, className = "" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronRight = ({ size = 24, className = "" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ArrowUpDown = ({ size = 24, className = "" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16" />
  </svg>
);

const Lightbulb = ({ size = 24, className = "" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18h6M10 22h4M15 8a5 5 0 1 0-6 0c0 2.5 2 3 3 6 1-3 3-3.5 3-6Z" />
  </svg>
);

// Component code starts here
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
  const [crescentSearch, setCrescentSearch] = useState('');
  const [plxSearch, setPlxSearch] = useState('');
  const [comparisonSearch, setComparisonSearch] = useState('');
  const [originalPlxWorkbook, setOriginalPlxWorkbook] = useState(null);
  const [plxRowMapping, setPlxRowMapping] = useState([]);

  // Parse PLX Excel file
  const parsePLXFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Store original workbook for export
        setOriginalPlxWorkbook(workbook);

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
        const rowMapping = [];
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
            rowIndex: i,
            columnMapping: columnMapping,
            shift: shift,
            department: row[0]?.toString() || '' // Column A is index 0
          });

          rowMapping.push({
            eid: eid,
            rowIndex: i,
            department: row[0]?.toString() || ''
          });
        }

        setPlxData(records);
        setPlxRowMapping(rowMapping);
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
          if (!badge || !badge.toString().toLowerCase().includes('plx')) return;

          // Try to match numeric EID format first: PLX-(\d+)-
          const numericEidMatch = badge.match(/PLX-(\d+)-/i);

          // If no numeric EID, try to match name-based format: PLX-{name} or plx-{name}
          const nameBasedMatch = !numericEidMatch && badge.match(/PLX-([A-Za-z]+)/i);

          if (!numericEidMatch && !nameBasedMatch) return;

          // Use numeric EID if available, otherwise use name-based identifier
          const eid = numericEidMatch ? numericEidMatch[1] : `NAME_${nameBasedMatch[1].toUpperCase()}`;
          const isNameBased = !numericEidMatch;

          const hours = parseFloat(hoursKey ? row[hoursKey] : 0) || 0;
          const line = lineKey ? row[lineKey] : '';

          if (!aggregated[eid]) {
            aggregated[eid] = {
              EID: eid,
              Badges: new Set(),
              Lines: new Set(),
              Total_Hours: 0,
              Direct_Hours: 0,
              Indirect_Hours: 0,
              ClockIn: '',
              ClockOut: '',
              _isNameBased: isNameBased,
              _extractedName: isNameBased ? nameBasedMatch[1] : null
            };
          }

          aggregated[eid].Badges.add(badge);
          aggregated[eid].Lines.add(line);
          aggregated[eid].Total_Hours += hours;

          // Check if this specific line/row is indirect or direct
          const isIndirect = line.toLowerCase().includes('indirect');
          if (isIndirect) {
            aggregated[eid].Indirect_Hours += hours;
          } else {
            aggregated[eid].Direct_Hours += hours;
          }

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
          Direct_Hours: Math.round(record.Direct_Hours * 100) / 100,
          Indirect_Hours: Math.round(record.Indirect_Hours * 100) / 100,
          ClockIn: record.ClockIn,
          ClockOut: record.ClockOut,
          _isNameBased: record._isNameBased || false,
          _extractedName: record._extractedName || null
        }));

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

      // By default PLX hours are Direct unless Dept contains -251-221 (Indirect)
      if (record.department.includes('-251-221')) {
        aggregated[record.EID].Indirect_Hours += totalHours;
      } else {
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
        Badge_Last3: crescentRecord?.Badge_Last3 || '',
        Total_Hours_Crescent: crescentHours,
        Total_Hours_PLX: plxHours,
        Status: diff < 0.01 ? 'Match' : 'Mismatch'
      };
    }).sort((a, b) => a.EID.localeCompare(b.EID));
  }, [crescentProcessed, plxForComparison, refreshTrigger]);

  // Split Crescent rows to show Direct and Indirect separately
  const displayCrescentRows = useMemo(() => {
    const separated = [];
    editedCrescentRows.forEach((row, originalIdx) => {
      const hasIndirect = row.Indirect_Hours > 0;
      const hasDirect = row.Direct_Hours > 0;

      if (hasIndirect && hasDirect) {
        // Split into two rows
        separated.push({
          ...row,
          Lines: 'Indirect',
          Total_Hours: row.Indirect_Hours,
          Direct_Hours: 0,
          Indirect_Hours: row.Indirect_Hours,
          _originalIdx: originalIdx,
          _type: 'indirect',
          _isSplit: true
        });
        separated.push({
          ...row,
          Total_Hours: row.Direct_Hours,
          Direct_Hours: row.Direct_Hours,
          Indirect_Hours: 0,
          _originalIdx: originalIdx,
          _type: 'direct',
          _isSplit: true
        });
      } else {
        // Keep as single row
        separated.push({
          ...row,
          _originalIdx: originalIdx,
          _type: hasIndirect ? 'indirect' : 'direct',
          _isSplit: false
        });
      }
    });
    return separated;
  }, [editedCrescentRows]);

  // Filtered data for search
  const filteredCrescentRows = useMemo(() => {
    if (!crescentSearch.trim()) return displayCrescentRows;
    const searchLower = crescentSearch.toLowerCase();
    return displayCrescentRows.filter(row =>
      row.EID?.toLowerCase().includes(searchLower) ||
      row.FullBadges?.toLowerCase().includes(searchLower) ||
      row.Badge_Last3?.toLowerCase().includes(searchLower) ||
      row.Lines?.toLowerCase().includes(searchLower)
    );
  }, [displayCrescentRows, crescentSearch]);

  // Split PLX rows to show Direct and Indirect separately
  const displayPlxRows = useMemo(() => {
    const separated = [];
    editedPlxRows.forEach((row, originalIdx) => {
      const hasIndirect = row.Indirect_Hours > 0;
      const hasDirect = row.Direct_Hours > 0;

      if (hasIndirect && hasDirect) {
        // Split into two rows
        separated.push({
          ...row,
          Department: '005-251-221 (Indirect)',
          Total_Hours: row.Indirect_Hours,
          Direct_Hours: 0,
          Indirect_Hours: row.Indirect_Hours,
          _originalIdx: originalIdx,
          _type: 'indirect',
          _isSplit: true
        });
        separated.push({
          ...row,
          Department: '004-251-211 (Direct)',
          Total_Hours: row.Direct_Hours,
          Direct_Hours: row.Direct_Hours,
          Indirect_Hours: 0,
          _originalIdx: originalIdx,
          _type: 'direct',
          _isSplit: true
        });
      } else {
        // Keep as single row
        separated.push({
          ...row,
          _originalIdx: originalIdx,
          _type: hasIndirect ? 'indirect' : 'direct',
          _isSplit: false
        });
      }
    });
    return separated;
  }, [editedPlxRows]);

  const filteredPlxRows = useMemo(() => {
    if (!plxSearch.trim()) return displayPlxRows;
    const searchLower = plxSearch.toLowerCase();
    return displayPlxRows.filter(row =>
      row.EID?.toLowerCase().includes(searchLower) ||
      row.Name?.toLowerCase().includes(searchLower)
    );
  }, [displayPlxRows, plxSearch]);

  const filteredComparison = useMemo(() => {
    if (!comparisonSearch.trim()) return comparison;
    const searchLower = comparisonSearch.toLowerCase();
    return comparison.filter(row =>
      row.EID?.toLowerCase().includes(searchLower) ||
      row.Name?.toLowerCase().includes(searchLower) ||
      row.Badge_Last3?.toLowerCase().includes(searchLower) ||
      row.Lines?.toLowerCase().includes(searchLower)
    );
  }, [comparison, comparisonSearch]);

  const mismatches = useMemo(() => {
    return comparison.filter(r => r.Status === 'Mismatch');
  }, [comparison]);

  // Smart recommendations
  const recommendations = useMemo(() => {
    const recs = [];

    // First, check for name-based badges that need matching
    editedCrescentRows.forEach(crescentRow => {
      if (crescentRow._isNameBased && crescentRow._extractedName) {
        const extractedName = crescentRow._extractedName.toLowerCase();

        // Find PLX records with matching or similar names
        plxForComparison.forEach(plxRecord => {
          const plxLastName = plxRecord.Name.split(' ').pop()?.toLowerCase() || '';
          const plxFirstName = plxRecord.Name.split(' ')[0]?.toLowerCase() || '';
          const plxFullName = plxRecord.Name.toLowerCase();

          // Check if extracted name matches last name, first name, or is contained in full name
          if (plxLastName.includes(extractedName) ||
              extractedName.includes(plxLastName) ||
              plxFirstName.includes(extractedName) ||
              extractedName.includes(plxFirstName) ||
              plxFullName.includes(extractedName)) {

            // Check if this recommendation doesn't already exist
            const alreadyAdded = recs.some(r =>
              r.crescentEID === crescentRow.EID && r.plxEID === plxRecord.EID
            );

            if (!alreadyAdded) {
              recs.push({
                type: 'Name-Based Badge',
                crescentEID: crescentRow.EID,
                crescentBadge: crescentRow.FullBadges,
                crescentHours: crescentRow.Total_Hours,
                plxEID: plxRecord.EID,
                plxName: plxRecord.Name,
                plxHours: plxRecord.Total_Hours,
                reason: `Badge "${crescentRow.FullBadges}" contains name "${extractedName.toUpperCase()}" matching "${plxRecord.Name}"`
              });
            }
          }
        });
      }
    });

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

    // Helper function to convert "LAST, FIRST MIDDLE" to "First Middle Last"
    const formatName = (name) => {
      if (!name || !name.includes(',')) return name;
      const parts = name.split(',').map(p => p.trim());
      if (parts.length !== 2) return name;
      const [last, firstMiddle] = parts;
      // Convert to proper case (title case)
      const toTitleCase = (str) => str.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      return `${toTitleCase(firstMiddle)} ${toTitleCase(last)}`;
    };

    // Helper function to format lines like "LINEG, LINEK" to "Line G/K"
    const formatLines = (lines) => {
      if (!lines) return '';
      const lineArray = lines.split(',').map(l => l.trim());
      const formatted = lineArray.map(line => {
        // Extract letter(s) after "LINE"
        const match = line.match(/LINE\s*([A-Z]+)/i);
        return match ? match[1].toUpperCase() : line;
      });
      return `Line ${formatted.join('/')}`;
    };

    // Helper function to format hours without unnecessary decimals
    const formatHours = (hours) => {
      const rounded = Math.round(hours * 100) / 100;
      return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toString();
    };

    // Helper function to extract PLX number (e.g., "PLX-21057999-AND" -> "PLX-21057999-AND")
    const extractPlxBadge = (badge) => {
      // Return the full badge, not just the part after PLX-
      return badge || '';
    };

    return checkedErrors.map((row, index) => {
      const badge = row.FullBadges.split(', ')[0] || '';
      const formattedName = formatName(row.Name);
      const formattedLines = formatLines(row.Lines);
      const plxHours = formatHours(row.Total_Hours_PLX);
      const crescentHours = formatHours(row.Total_Hours_Crescent);
      const plxBadge = extractPlxBadge(badge);

      return `${index + 1}. ${formattedName} – worked on ${formattedLines} for ${plxHours} hours, not ${crescentHours} hours\n${plxBadge}`;
    }).join('\n\n');
  }, [mismatches, crescentErrors]);

  const handleFixRecommendation = (rec) => {
    // Update Crescent EID to match PLX EID
    const updatedRows = editedCrescentRows.map(row => {
      if (row.EID === rec.crescentEID) {
        // For name-based badges, we need to reconstruct the badge with the correct EID
        if (row._isNameBased) {
          // Extract the badge letters from the original badge
          const badgeLetters = row.FullBadges.match(/[A-Za-z]+$/)?.[0] || 'XXX';
          return {
            ...row,
            EID: rec.plxEID,
            FullBadges: `PLX-${rec.plxEID}-${badgeLetters}`,
            Badge_Last3: badgeLetters.slice(-3),
            _isNameBased: false,
            _extractedName: null
          };
        } else {
          // For numeric EID badges, use the original logic
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
      }
      return row;
    });

    setEditedCrescentRows(updatedRows);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCopyReport = async () => {
    try {
      // Try using the modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(errorReportText);
        alert('Error report copied to clipboard!');
      } else {
        // Fallback for older browsers or unsecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = errorReportText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (successful) {
            alert('Error report copied to clipboard!');
          } else {
            alert('Failed to copy. Please manually select and copy the text.');
          }
        } catch (err) {
          alert('Failed to copy. Please manually select and copy the text.');
        }

        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy. Please manually select and copy the text.');
    }
  };

  const handlePlxSync = (eid) => {
    // Find the Crescent record for this EID
    const crescentRecord = editedCrescentRows.find(r => r.EID === eid);
    if (!crescentRecord) return;

    // Find or create the PLX record for this EID
    const plxIndex = editedPlxRows.findIndex(r => r.EID === eid);

    if (plxIndex >= 0) {
      // Update existing PLX record
      const newRows = [...editedPlxRows];
      newRows[plxIndex] = {
        ...newRows[plxIndex],
        Total_Hours: crescentRecord.Total_Hours,
        Direct_Hours: crescentRecord.Direct_Hours,
        Indirect_Hours: crescentRecord.Indirect_Hours
      };
      setEditedPlxRows(newRows);
    } else {
      // Create new PLX record
      const newRow = {
        EID: eid,
        Name: crescentRecord.Name || '',
        Total_Hours: crescentRecord.Total_Hours,
        Direct_Hours: crescentRecord.Direct_Hours,
        Indirect_Hours: crescentRecord.Indirect_Hours
      };
      setEditedPlxRows([...editedPlxRows, newRow]);
    }

    setRefreshTrigger(prev => prev + 1);
  };

  const sortCrescentData = (column) => {
    const direction = crescentSort.column === column && crescentSort.direction === 'asc' ? 'desc' : 'asc';
    setCrescentSort({ column, direction });

    const sorted = [...editedCrescentRows].sort((a, b) => {
      let aVal, bVal;
      if (column === 'EID') {
        aVal = a.EID;
        bVal = b.EID;
      } else if (column === 'Badge') {
        aVal = a.Badge_Last3 || '';
        bVal = b.Badge_Last3 || '';
      } else if (column === 'Lines') {
        aVal = a.Lines || '';
        bVal = b.Lines || '';
      } else {
        aVal = a[column] || '';
        bVal = b[column] || '';
      }
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

  const handleExportRevisedPlx = () => {
    if (!plxData || editedPlxRows.length === 0) {
      alert('Please upload a PLX file first');
      return;
    }

    try {
      // Create new formatted workbook
      const workbook = XLSX.utils.book_new();

      // Create header row
      const headers = ['Dept', 'EID', 'Name', 'Hours'];
      const data = [headers];

      // Separate Direct and Indirect rows based on actual hours values
      const directRows = [];
      const indirectRows = [];

      editedPlxRows.forEach(row => {
        const directHours = parseFloat(row.Direct_Hours) || 0;
        const indirectHours = parseFloat(row.Indirect_Hours) || 0;

        // Add to Direct section if they have Direct hours
        if (directHours > 0) {
          // Use a Direct department code
          const directDept = row.Department ?
            row.Department.replace(/-251-221/, '-251-211') : '004-251-211';

          directRows.push({
            Department: directDept,
            EID: row.EID || '',
            Name: row.Name || '',
            Hours: directHours
          });
        }

        // Add to Indirect section if they have Indirect hours
        if (indirectHours > 0) {
          // Use an Indirect department code
          const indirectDept = row.Department ?
            row.Department.replace(/-251-211/, '-251-221') : '005-251-221';

          indirectRows.push({
            Department: indirectDept,
            EID: row.EID || '',
            Name: row.Name || '',
            Hours: indirectHours
          });
        }
      });

      // Add Direct section
      directRows.forEach(row => {
        data.push([
          row.Department,
          row.EID,
          row.Name,
          row.Hours.toFixed(2)
        ]);
      });

      // Calculate Direct summary
      const directHours = directRows.reduce((sum, row) => sum + row.Hours, 0);

      // Add blank row separator
      data.push([]);

      // Add Indirect section
      indirectRows.forEach(row => {
        data.push([
          row.Department,
          row.EID,
          row.Name,
          row.Hours.toFixed(2)
        ]);
      });

      // Calculate Indirect summary
      const indirectHours = indirectRows.reduce((sum, row) => sum + row.Hours, 0);

      // Add blank row before summary
      data.push([]);

      // Add summary section
      data.push(['Summary', '', '', '']);
      data.push(['Direct Associates:', directRows.length, 'Direct Hours:', directHours.toFixed(2)]);
      data.push(['Indirect Associates:', indirectRows.length, 'Indirect Hours:', indirectHours.toFixed(2)]);
      data.push(['Total Associates:', editedPlxRows.length, 'Total Hours:', (directHours + indirectHours).toFixed(2)]);

      // Create worksheet from data
      const worksheet = XLSX.utils.aoa_to_sheet(data);

      // Set column widths for better formatting
      worksheet['!cols'] = [
        { wch: 20 },  // Dept
        { wch: 12 },  // EID
        { wch: 25 },  // Name
        { wch: 12 }   // Hours
      ];

      // Define border style
      const borderStyle = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };

      // Define header style
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderStyle
      };

      // Define data cell style
      const dataCellStyle = {
        border: borderStyle,
        alignment: { vertical: 'center' }
      };

      // Define summary header style
      const summaryHeaderStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '70AD47' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderStyle
      };

      // Define summary cell style
      const summaryCellStyle = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E2EFDA' } },
        border: borderStyle,
        alignment: { vertical: 'center' }
      };

      // Apply styles to all cells
      const range = XLSX.utils.decode_range(worksheet['!ref']);

      // Find summary row
      const summaryRowIdx = data.findIndex(row => row[0] === 'Summary');

      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;

          // Header row (first row)
          if (R === 0) {
            worksheet[cellAddress].s = headerStyle;
          }
          // Summary section
          else if (R >= summaryRowIdx && summaryRowIdx !== -1) {
            if (R === summaryRowIdx) {
              worksheet[cellAddress].s = summaryHeaderStyle;
            } else {
              worksheet[cellAddress].s = summaryCellStyle;
            }
          }
          // Data rows
          else if (data[R] && data[R].length > 0) {
            worksheet[cellAddress].s = dataCellStyle;

            // Right-align hours column
            if (C === 3 && !isNaN(parseFloat(data[R][C]))) {
              worksheet[cellAddress].s = {
                ...dataCellStyle,
                alignment: { horizontal: 'right', vertical: 'center' },
                numFmt: '0.00'
              };
            }
          }
        }
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Revised PLX');

      // Export the file
      const fileName = `Revised_PLX_${selectedDay}_${selectedShift.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      alert('Revised PLX file exported successfully!');
    } catch (error) {
      console.error('Error exporting PLX file:', error);
      alert('Error exporting PLX file. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Labor Hours Comparison Tool</h1>
            <p className="text-gray-600">Compare ProLogistix and Crescent reports to identify discrepancies</p>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500 font-mono">v1.4.0</span>
          </div>
        </div>
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
            <div className="flex items-end gap-3">
              <button
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Refresh Comparison
              </button>
              <button
                onClick={handleExportRevisedPlx}
                disabled={!plxData || editedPlxRows.length === 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export Revised PLX
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

      {/* Detail Tables */}
      {crescentProcessed.length > 0 && editedPlxRows.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
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
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <input
                      type="text"
                      placeholder="Search by EID, Badge, or Line..."
                      value={crescentSearch}
                      onChange={(e) => setCrescentSearch(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                    />
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
                          <th className="p-3 text-left">
                            <button onClick={() => sortCrescentData('Lines')} className="flex items-center gap-1 font-semibold hover:text-indigo-600">
                              Lines <ArrowUpDown size={14} />
                            </button>
                          </th>
                          <th className="p-3 text-right font-semibold">Total</th>
                          <th className="p-3 text-right font-semibold">Direct</th>
                          <th className="p-3 text-right font-semibold">Indirect</th>
                          <th className="p-3 text-center font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCrescentRows.map((row, idx) => {
                          const originalIdx = row._originalIdx;
                          const isSplit = row._isSplit;
                          const isIndirect = row._type === 'indirect';
                          return (
                          <tr key={`${originalIdx}-${row._type}`} className={`border-t border-gray-200 hover:bg-indigo-50/50 transition-colors ${isSplit ? 'bg-gray-50' : ''}`}>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.EID}
                                onChange={(e) => {
                                  const newRows = [...editedCrescentRows];
                                  newRows[originalIdx].EID = e.target.value;
                                  setEditedCrescentRows(newRows);
                                }}
                                className="w-full border border-gray-300 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none"
                                disabled={isSplit}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.Badge_Last3}
                                onChange={(e) => {
                                  const newRows = [...editedCrescentRows];
                                  const newLast3 = e.target.value.toUpperCase();
                                  newRows[originalIdx].Badge_Last3 = newLast3;
                                  if (newRows[originalIdx].FullBadges) {
                                    const badgeBase = newRows[originalIdx].FullBadges.slice(0, -3);
                                    newRows[originalIdx].FullBadges = badgeBase + newLast3;
                                  }
                                  setEditedCrescentRows(newRows);
                                }}
                                title={row.FullBadges}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none uppercase"
                                placeholder="ABC"
                                maxLength="3"
                                disabled={isSplit}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.Lines}
                                onChange={(e) => {
                                  const newRows = [...editedCrescentRows];
                                  newRows[originalIdx].Lines = e.target.value;
                                  setEditedCrescentRows(newRows);
                                }}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                                placeholder="e.g., LINEG, LINEK"
                                disabled={isSplit}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <span className="text-sm px-2 py-1">{row.Total_Hours.toFixed(2)}</span>
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={row.Direct_Hours}
                                onChange={(e) => {
                                  const newRows = [...editedCrescentRows];
                                  const newValue = parseFloat(e.target.value) || 0;
                                  if (isSplit) {
                                    newRows[originalIdx].Direct_Hours = newValue;
                                    newRows[originalIdx].Total_Hours = newValue + newRows[originalIdx].Indirect_Hours;
                                  } else {
                                    newRows[originalIdx].Direct_Hours = newValue;
                                    newRows[originalIdx].Total_Hours = newValue + newRows[originalIdx].Indirect_Hours;
                                  }
                                  setEditedCrescentRows(newRows);
                                }}
                                className="w-20 text-right border border-gray-300 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none"
                                disabled={isSplit && !isIndirect}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={row.Indirect_Hours}
                                onChange={(e) => {
                                  const newRows = [...editedCrescentRows];
                                  const newValue = parseFloat(e.target.value) || 0;
                                  if (isSplit) {
                                    newRows[originalIdx].Indirect_Hours = newValue;
                                    newRows[originalIdx].Total_Hours = newValue + newRows[originalIdx].Direct_Hours;
                                  } else {
                                    newRows[originalIdx].Indirect_Hours = newValue;
                                    newRows[originalIdx].Total_Hours = newValue + newRows[originalIdx].Direct_Hours;
                                  }
                                  setEditedCrescentRows(newRows);
                                }}
                                className="w-20 text-right border border-gray-300 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none"
                                disabled={isSplit && isIndirect}
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  const newRows = editedCrescentRows.filter((_, i) => i !== originalIdx);
                                  setEditedCrescentRows(newRows);
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                        })}
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
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <input
                      type="text"
                      placeholder="Search by EID or Name..."
                      value={plxSearch}
                      onChange={(e) => setPlxSearch(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    />
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
                          <th className="p-3 text-left font-semibold">Dept</th>
                          <th className="p-3 text-right font-semibold">Total</th>
                          <th className="p-3 text-right font-semibold">Direct</th>
                          <th className="p-3 text-right font-semibold">Indirect</th>
                          <th className="p-3 text-center font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlxRows.map((row, idx) => {
                          const originalIdx = row._originalIdx;
                          const isSplit = row._isSplit;
                          const isIndirect = row._type === 'indirect';
                          return (
                          <tr key={`${originalIdx}-${row._type}`} className={`border-t border-gray-200 hover:bg-blue-50/50 transition-colors ${isSplit ? 'bg-gray-50' : ''}`}>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.EID}
                                onChange={(e) => {
                                  const newRows = [...editedPlxRows];
                                  newRows[originalIdx].EID = e.target.value;
                                  setEditedPlxRows(newRows);
                                }}
                                className="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                disabled={isSplit}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.Name}
                                onChange={(e) => {
                                  const newRows = [...editedPlxRows];
                                  newRows[originalIdx].Name = e.target.value;
                                  setEditedPlxRows(newRows);
                                }}
                                className="w-full border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                disabled={isSplit}
                              />
                            </td>
                            <td className="p-2">
                              <span className="text-xs px-2 py-1" title={row.Department}>{row.Department || '-'}</span>
                            </td>
                            <td className="p-2 text-right">
                              <span className="text-sm px-2 py-1">{row.Total_Hours.toFixed(2)}</span>
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={row.Direct_Hours}
                                onChange={(e) => {
                                  const newRows = [...editedPlxRows];
                                  const newValue = parseFloat(e.target.value) || 0;
                                  if (isSplit) {
                                    newRows[originalIdx].Direct_Hours = newValue;
                                    newRows[originalIdx].Total_Hours = newValue + newRows[originalIdx].Indirect_Hours;
                                  } else {
                                    newRows[originalIdx].Direct_Hours = newValue;
                                    newRows[originalIdx].Total_Hours = newValue + newRows[originalIdx].Indirect_Hours;
                                  }
                                  setEditedPlxRows(newRows);
                                }}
                                className="w-20 text-right border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                disabled={isSplit && !isIndirect}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={row.Indirect_Hours}
                                onChange={(e) => {
                                  const newRows = [...editedPlxRows];
                                  const newValue = parseFloat(e.target.value) || 0;
                                  if (isSplit) {
                                    newRows[originalIdx].Indirect_Hours = newValue;
                                    newRows[originalIdx].Total_Hours = newValue + newRows[originalIdx].Direct_Hours;
                                  } else {
                                    newRows[originalIdx].Indirect_Hours = newValue;
                                    newRows[originalIdx].Total_Hours = newValue + newRows[originalIdx].Direct_Hours;
                                  }
                                  setEditedPlxRows(newRows);
                                }}
                                className="w-20 text-right border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                disabled={isSplit && isIndirect}
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  const newRows = editedPlxRows.filter((_, i) => i !== originalIdx);
                                  setEditedPlxRows(newRows);
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                        })}
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
                            rec.type === 'Name-Based Badge' ? 'bg-indigo-100 text-indigo-800' :
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
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search by EID, Name, Badge, or Line..."
                    value={comparisonSearch}
                    onChange={(e) => setComparisonSearch(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>
                <div className="overflow-auto border-2 border-gray-200 rounded-lg max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="p-3 text-left font-semibold">EID</th>
                        <th className="p-3 text-left font-semibold">Name</th>
                        <th className="p-3 text-left font-semibold">Lines</th>
                        <th className="p-3 text-right font-semibold">Crescent</th>
                        <th className="p-3 text-right font-semibold">PLX</th>
                        <th className="p-3 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComparison.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`border-t border-gray-200 hover:bg-gray-50 ${row.Status === 'Mismatch' ? 'bg-red-50' : ''}`}
                        >
                          <td className="p-3">{row.EID}</td>
                          <td className="p-3">{row.Name}</td>
                          <td className="p-3">{row.Lines || '-'}</td>
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
                      <th className="p-3 text-center font-semibold">Actions</th>
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
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handlePlxSync(row.EID)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs font-medium transition-all whitespace-nowrap"
                            title="Sync PLX hours to match Crescent"
                          >
                            PLX Sync
                          </button>
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

// Render the app
ReactDOM.render(<PLXCrescentCompare />, document.getElementById('root'));

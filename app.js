const API_URL = "https://script.google.com/macros/s/AKfycbz4HsegS05tLcqTieXB1ev54--ixZPDjkuGfyyixv03ZNY65BIzwGMeR2rVVe9dzkRbQA/exec";

let allData = [];
let filteredData = [];
let chartT, chartZ;

const HEADERS = ["SR No","Invoice No","Invoice Date","Date In","Date Out","Year","Month","Client Name","Destination","State","Zone","Actual Truck Weight","Calling Truck Weight","CLTT","CLUB","Charged Weight","Freight OLD","Per Kg","Final Freight Old","Freight NEW","DD","Per Kg 2","OUSP Weight","OUSP Calling 2","Final Freight New","Saving","Truck No","LR No","Transporter","Rate As Per Flat","Saving As Per Flat Rate","KK","Weight Loss","Freight Loss","Sale Value","Detention Days","Detention Amount","Quantity","Vehicle Capacity"];

const COLUMN_MAP = {
  "SR No": ["SR No","SR. No.","SR No.","Sr No","S No","S.No","SrNo"],
  "Invoice No": ["Invoice No","Invoice No.","Invoice Number","InvoiceNo"],
  "Invoice Date": ["Invoice Date","Invoice Date / Month","Invoice Date/Month","Invoice Month","InvoiceDate"],
  "Date In": ["Date In","Date In Time","Gate In","In Date","DateIn"],
  "Date Out": ["Date Out","Date Out Time","Gate Out","Out Date","DateOut"],
  "Truck No": ["Truck No","Truck No.","Vehicle No","Vehicle No.","TruckNo"],
  "LR No": ["LR No","LR No.","LR Number","LRNo"],
  "DD": ["DD","dd"],
  "Per Kg": ["Per Kg","Perkg","Per Kg 1","PerKg"],
  "Per Kg 2": ["Per Kg 2","Perkg2","PerKg2"],
  "Freight OLD": ["Freight OLD","Freight Old","FreightOld"],
  "Freight NEW": ["Freight NEW","Freight New","FreightNew"],
  "Weight Loss": ["Weight Loss","Weighjt Loss","Wt Loss"],
  "Sale Value": ["Sale Value","Sales Value","SaleValue"]
};

function norm(s) { return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,""); }

function findKey(rowObj, header) {
  const variations = COLUMN_MAP[header] || [header];
  const keys = Object.keys(rowObj);
  for (const v of variations) {
    const target = norm(v);
    const found = keys.find(k => norm(k) === target);
    if (found) return found;
  }
  return null;
}

function showStatus(msg, type="info") {
  const el = document.getElementById("statusBar");
  const colors = {info:"bg-blue-100 text-blue-800",success:"bg-green-100 text-green-800",error:"bg-red-100 text-red-800"};
  el.className = "mb-4 p-3 rounded text-sm " + colors[type];
  el.textContent = msg;
  el.classList.remove("hidden");
  if (type === "success") setTimeout(() => el.classList.add("hidden"), 4000);
}

function fmt(n) {
  if (n === null || n === undefined || n === "") return "";
  const num = Number(n);
  if (isNaN(num)) return n;
  return num.toLocaleString("en-IN", {maximumFractionDigits: 2});
}

async function loadData() {
  showStatus("Loading data...", "info");
  try {
    const res = await fetch(API_URL + "?action=getAll");
    const json = await res.json();
    if (json.status === "success") {
      allData = json.data;
      filteredData = [...allData];
      populateFilters();
      renderTable();
      loadSummary();
      showStatus("✅ Loaded " + allData.length + " records", "success");
    } else showStatus("Error: " + json.message, "error");
  } catch (err) { showStatus("Network error: " + err.message, "error"); }
}

async function loadSummary() {
  try {
    const res = await fetch(API_URL + "?action=getSummary");
    const json = await res.json();
    if (json.status !== "success") return;
    const s = json.summary;
    const uniqueVehicles = new Set(allData.map(r => r["Truck No"]).filter(Boolean)).size;
    const uniqueTransporters = Object.keys(s.transporters).length;
    const uniqueClients = Object.keys(s.clients).length;

    document.getElementById("summaryCards").innerHTML = `
      ${card("Total Trips", s.totalTrips, "bg-blue-500")}
      ${card("Total Vehicles", uniqueVehicles, "bg-cyan-500")}
      ${card("Transporters", uniqueTransporters, "bg-indigo-500")}
      ${card("Clients", uniqueClients, "bg-teal-500")}
      ${card("Total Sale Value", "₹" + fmt(s.totalSale), "bg-emerald-500")}
      ${card("Freight (New)", "₹" + fmt(s.totalFreightNew), "bg-orange-500")}
      ${card("Freight (Old)", "₹" + fmt(s.totalFreightOld), "bg-amber-500")}
      ${card("Total Saving", "₹" + fmt(s.totalSaving), "bg-purple-500")}
      ${card("Total Weight (kg)", fmt(s.totalWeight), "bg-pink-500")}
    `;
    drawChart("chartTransporter", s.transporters, "chartT");
    drawChart("chartZone", s.zones, "chartZ");
  } catch (err) { console.error(err); }
}

function card(label, val, color) {
  return `<div class="${color} text-white p-3 rounded shadow"><div class="text-xs opacity-90">${label}</div><div class="text-xl font-bold mt-1">${val}</div></div>`;
}

function drawChart(canvasId, dataObj, ref) {
  const sorted = Object.entries(dataObj).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (ref === "chartT" && chartT) chartT.destroy();
  if (ref === "chartZ" && chartZ) chartZ.destroy();
  const chart = new Chart(ctx, {
    type: "bar",
    data: { labels: sorted.map(s=>s[0]), datasets: [{label:"Trips", data: sorted.map(s=>s[1]), backgroundColor:"#3b82f6"}] },
    options: {responsive:true, plugins:{legend:{display:false}}}
  });
  if (ref === "chartT") chartT = chart; else chartZ = chart;
}

function populateFilters() {
  const states = [...new Set(allData.map(r=>r["State"]).filter(Boolean))].sort();
  const zones = [...new Set(allData.map(r=>r["Zone"]).filter(Boolean))].sort();
  const years = [...new Set(allData.map(r=>r["Year"]).filter(Boolean))].sort();
  fillSelect("fState", states);
  fillSelect("fZone", zones);
  fillSelect("fYear", years);
}

function fillSelect(id, arr) {
  const el = document.getElementById(id);
  const cur = el.value;
  el.innerHTML = '<option value="">All</option>' + arr.map(v=>`<option value="${v}">${v}</option>`).join("");
  el.value = cur;
}

function applyFilters() {
  const t = document.getElementById("fTransporter").value.toLowerCase();
  const c = document.getElementById("fClient").value.toLowerCase();
  const d = document.getElementById("fDestination").value.toLowerCase();
  const st = document.getElementById("fState").value;
  const z = document.getElementById("fZone").value;
  const y = document.getElementById("fYear").value;
  const inv = document.getElementById("fInvoice").value.toLowerCase();
  const v = document.getElementById("fVehicle").value.toLowerCase();
  const lr = document.getElementById("fLR").value.toLowerCase();
  filteredData = allData.filter(r =>
    (!t || String(r["Transporter"]||"").toLowerCase().includes(t))
    && (!c || String(r["Client Name"]||"").toLowerCase().includes(c))
    && (!d || String(r["Destination"]||"").toLowerCase().includes(d))
    && (!st || r["State"] == st)
    && (!z || r["Zone"] == z)
    && (!y || String(r["Year"]) == String(y))
    && (!inv || String(r["Invoice No"]||"").toLowerCase().includes(inv))
    && (!v || String(r["Truck No"]||"").toLowerCase().includes(v))
    && (!lr || String(r["LR No"]||"").toLowerCase().includes(lr))
  );
  renderTable();
}

function resetFilters() {
  ["fTransporter","fClient","fDestination","fInvoice","fVehicle","fLR"].forEach(id=>document.getElementById(id).value="");
  ["fState","fZone","fYear"].forEach(id=>document.getElementById(id).value="");
  filteredData = [...allData];
  renderTable();
}

function renderTable() {
  document.getElementById("tableHead").innerHTML = HEADERS.map(h=>`<th class="p-2 text-left whitespace-nowrap">${h}</th>`).join("");
  const tbody = document.getElementById("tableBody");
  if (filteredData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${HEADERS.length}" class="p-4 text-center text-gray-500">No data. Upload Excel to begin.</td></tr>`;
  } else {
    tbody.innerHTML = filteredData.map((r,i)=>
      `<tr class="${i%2?'bg-slate-50':'bg-white'} hover:bg-yellow-50">` +
      HEADERS.map(h=>`<td class="p-2 whitespace-nowrap border-b">${r[h]!==undefined && r[h]!==""?r[h]:""}</td>`).join("") +
      `</tr>`).join("");
  }
  document.getElementById("resultCount").textContent = `Showing ${filteredData.length} of ${allData.length} records`;
}

function exportCSV() {
  if (!filteredData.length) return alert("No data to export");
  const csv = [HEADERS.join(",")].concat(
    filteredData.map(r => HEADERS.map(h => `"${String(r[h]||"").replace(/"/g,'""')}"`).join(","))
  ).join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "logistics_export.csv"; a.click();
}

document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  showStatus("Reading Excel...", "info");
  const reader = new FileReader();
  
  reader.onerror = () => showStatus("File read error", "error");
  
  reader.onload = async (evt) => {
    try {
      const wb = XLSX.read(evt.target.result, {type:"array"});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {defval:"", raw: false});
      if (!rows.length) { showStatus("Excel is empty", "error"); return; }
      
      console.log("Excel columns found:", Object.keys(rows[0]));
      
      const mapped = rows.map(r => {
        const o = {};
        HEADERS.forEach(h => {
          const key = findKey(r, h);
          o[h] = key ? r[key] : "";
        });
        return o;
      });
      
      console.log("First mapped row:", mapped[0]);
      showStatus(`Uploading ${mapped.length} rows... please wait`, "info");
      
      const res = await fetch(API_URL, {
        method:"POST",
        body: JSON.stringify({action:"addRows", rows: mapped})
      });
      const json = await res.json();
      
      if (json.status === "success") {
        showStatus(`✅ Successfully added ${json.added} rows`, "success");
        loadData();
      } else {
        showStatus("Upload failed: " + json.message, "error");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showStatus("Error: " + err.message, "error");
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = "";
});

async function clearAllData() {
  if (!confirm("Delete ALL data from sheet? This cannot be undone.")) return;
  showStatus("Clearing...", "info");
  try {
    const res = await fetch(API_URL, {method:"POST", body: JSON.stringify({action:"clearAll"})});
    const json = await res.json();
    if (json.status === "success") { showStatus("Cleared", "success"); loadData(); }
    else showStatus("Error: " + json.message, "error");
  } catch (err) { showStatus("Error: " + err.message, "error"); }
}

loadData();

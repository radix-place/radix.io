(() => {
  "use strict";

  const DATA_INDEX_URL = "./data/index.json";
  const DATA_BASE_URL = "./data/";

  const sexLabels = {
    female: "Femenino",
    male: "Masculino",
    unknown: "Desconocido",
    both: "Ambos (series separadas)",
    integrated: "Total integrado (F + M)",
  };

  const selectableSexes = ["female", "male"];
  const numberFormatter = new Intl.NumberFormat("es-CO");

  const elements = {
    status: document.querySelector("#dataset-status"),
    modeInputs: [...document.querySelectorAll('input[name="query-mode"]')],
    comparisonPanel: document.querySelector("#comparison-country-panel"),
    comparisonError: document.querySelector("#comparison-error"),
    countrySearch: document.querySelector("#country-search"),
    countrySelect: document.querySelector("#country-select"),
    countrySearch2: document.querySelector("#country-search-2"),
    countrySelect2: document.querySelector("#country-select-2"),
    sexSelect: document.querySelector("#sex-select"),
    yearFrom: document.querySelector("#year-from"),
    yearTo: document.querySelector("#year-to"),
    results: document.querySelector("#results"),
    resultTitle: document.querySelector("#result-title"),
    resultSubtitle: document.querySelector("#result-subtitle"),
    metricLabelPeriod: document.querySelector("#metric-label-period"),
    metricLabelObserved: document.querySelector("#metric-label-observed"),
    metricLabelLatest: document.querySelector("#metric-label-latest"),
    metricLabelMissing: document.querySelector("#metric-label-missing"),
    metricPeriod: document.querySelector("#metric-period"),
    metricObserved: document.querySelector("#metric-observed"),
    metricLatest: document.querySelector("#metric-latest"),
    metricMissing: document.querySelector("#metric-missing"),
    chart: document.querySelector("#series-chart"),
    chartEmpty: document.querySelector("#chart-empty"),
    chartTitle: document.querySelector("#chart-title"),
    chartDescription: document.querySelector("#chart-description"),
    chartLegend: document.querySelector("#chart-legend"),
    recordsHead: document.querySelector("#records-head"),
    recordsBody: document.querySelector("#records-body"),
    tableCaption: document.querySelector("#table-caption"),
    downloadButton: document.querySelector("#download-button"),
  };

  const state = {
    index: null,
    countries: [],
    filteredPrimary: [],
    filteredSecondary: [],
    countryDataPrimary: null,
    countryDataSecondary: null,
    selectedSeries: [],
  };

  function mode() {
    return elements.modeInputs.find((input) => input.checked)?.value || "single";
  }

  function normalize(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  }

  function setStatus(message, isError = false) {
    elements.status.textContent = message;
    elements.status.style.color = isError ? "#a44f32" : "";
  }

  function setFormMessage(message = "") {
    elements.comparisonError.textContent = message;
    elements.comparisonError.hidden = !message;
  }

  function option(value, label) {
    const element = document.createElement("option");
    element.value = value;
    element.textContent = label;
    return element;
  }

  function countryMeta(code) {
    return state.countries.find((country) => country.code === code) || null;
  }

  function renderCountryOptions(select, countries, selected = "", excludedCode = "") {
    select.replaceChildren(option("", "Seleccione una opción"));
    for (const country of countries) {
      if (country.code === excludedCode) continue;
      select.append(
        option(
          country.code,
          `${country.name_source} (${country.year_min}–${country.year_max})`
        )
      );
    }
    select.value = countries.some(
      (country) => country.code === selected && country.code !== excludedCode
    )
      ? selected
      : "";
  }

  function filterPrimaryCountries() {
    const query = normalize(elements.countrySearch.value.trim());
    const selected = elements.countrySelect.value;
    state.filteredPrimary = query
      ? state.countries.filter((country) =>
          normalize(country.name_source).includes(query)
        )
      : [...state.countries];
    renderCountryOptions(elements.countrySelect, state.filteredPrimary, selected);
  }

  function filterSecondaryCountries() {
    const query = normalize(elements.countrySearch2.value.trim());
    const selected = elements.countrySelect2.value;
    const excluded = elements.countrySelect.value;
    state.filteredSecondary = query
      ? state.countries.filter((country) =>
          normalize(country.name_source).includes(query)
        )
      : [...state.countries];
    renderCountryOptions(
      elements.countrySelect2,
      state.filteredSecondary,
      selected,
      excluded
    );
  }

  function refreshSecondaryOptions() {
    const selected = elements.countrySelect2.value;
    const excluded = elements.countrySelect.value;
    renderCountryOptions(
      elements.countrySelect2,
      state.filteredSecondary,
      selected,
      excluded
    );
    if (selected === excluded) {
      elements.countrySelect2.value = "";
      state.countryDataSecondary = null;
    }
  }

  async function fetchCountry(code) {
    const meta = countryMeta(code);
    if (!meta) return null;

    const embeddedCountry = window.RADIX_HOMICIDE_DATA?.countries?.[code];
    if (embeddedCountry) return embeddedCountry;

    const response = await fetch(`${DATA_BASE_URL}${meta.file}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function activeCountryData() {
    if (!state.countryDataPrimary) return [];
    if (mode() === "single") return [state.countryDataPrimary];
    if (!state.countryDataSecondary) return [];
    return [state.countryDataPrimary, state.countryDataSecondary];
  }

  function commonSelectableSexes() {
    const datasets = activeCountryData();
    if (!datasets.length) return [];
    return selectableSexes.filter((sex) =>
      datasets.every((dataset) => dataset.coverage.sexes.includes(sex))
    );
  }

  function availableSexSelections() {
    const common = commonSelectableSexes();
    const selections = [...common];
    if (common.includes("female") && common.includes("male")) {
      selections.push("both", "integrated");
    }
    return selections;
  }

  function populateSexes(preferredSex = "") {
    const available = availableSexSelections();
    const current = preferredSex || elements.sexSelect.value;

    elements.sexSelect.replaceChildren(option("", "Seleccione"));
    for (const sex of available) {
      elements.sexSelect.append(option(sex, sexLabels[sex] || sex));
    }

    elements.sexSelect.value = available.includes(current)
      ? current
      : available.includes("female")
        ? "female"
        : available[0] || "";
    elements.sexSelect.disabled = available.length === 0;
  }

  function selectedSexCodes(selection = elements.sexSelect.value) {
    if (selection === "both" || selection === "integrated") {
      return ["female", "male"];
    }
    return selectableSexes.includes(selection) ? [selection] : [];
  }

  function integratedRecords(records) {
    const byYear = new Map();
    for (const record of records) {
      if (!selectableSexes.includes(record.sex_code)) continue;
      if (!byYear.has(record.year)) byYear.set(record.year, {});
      byYear.get(record.year)[record.sex_code] = record;
    }

    return [...byYear.entries()]
      .sort((first, second) => first[0] - second[0])
      .flatMap(([year, components]) => {
        const female = components.female;
        const male = components.male;
        if (!female || !male) return [];
        return [{
          year,
          sex_code: "integrated",
          death_count: female.death_count + male.death_count,
          female_death_count: female.death_count,
          male_death_count: male.death_count,
          female_record_id: female.record_id,
          male_record_id: male.record_id,
          record_id: `derived:${female.record_id}+${male.record_id}`,
          derived: true,
        }];
      });
  }

  function recordsForSelection(countryData, selection = elements.sexSelect.value) {
    if (!countryData) return [];
    const selected = new Set(selectedSexCodes(selection));
    const records = countryData.records
      .filter((record) => selected.has(record.sex_code))
      .sort((a, b) => a.year - b.year || a.sex_code.localeCompare(b.sex_code));
    return selection === "integrated" ? integratedRecords(records) : records;
  }

  function populateYears(preferredFrom, preferredTo) {
    const observedYears = activeCountryData().flatMap((data) =>
      recordsForSelection(data).map((record) => record.year)
    );

    elements.yearFrom.replaceChildren();
    elements.yearTo.replaceChildren();

    if (!observedYears.length) {
      elements.yearFrom.disabled = true;
      elements.yearTo.disabled = true;
      return;
    }

    const min = Math.min(...observedYears);
    const max = Math.max(...observedYears);
    const years = Array.from({ length: max - min + 1 }, (_, index) => min + index);

    for (const year of years) {
      elements.yearFrom.append(option(String(year), String(year)));
      elements.yearTo.append(option(String(year), String(year)));
    }

    const requestedFrom = Number(preferredFrom);
    const requestedTo = Number(preferredTo);
    elements.yearFrom.value = years.includes(requestedFrom)
      ? String(requestedFrom)
      : String(min);
    elements.yearTo.value = years.includes(requestedTo)
      ? String(requestedTo)
      : String(max);
    elements.yearFrom.disabled = false;
    elements.yearTo.disabled = false;
  }

  function clearResults() {
    elements.results.hidden = true;
    elements.recordsHead.replaceChildren();
    elements.recordsBody.replaceChildren();
    elements.chartLegend.replaceChildren();
    state.selectedSeries = [];
  }

  function validateSelection() {
    if (!state.countryDataPrimary) {
      setFormMessage("");
      return false;
    }

    if (mode() === "compare") {
      if (!state.countryDataSecondary) {
        setFormMessage("Seleccione un segundo país para activar la comparación.");
        return false;
      }
      if (
        state.countryDataPrimary.country.code ===
        state.countryDataSecondary.country.code
      ) {
        setFormMessage("Los países A y B deben ser diferentes.");
        return false;
      }
      if (!availableSexSelections().length) {
        setFormMessage(
          "Los dos países no comparten registros femeninos o masculinos comparables."
        );
        return false;
      }
    }

    if (!elements.sexSelect.value) {
      setFormMessage("No hay una opción de sexo disponible para la selección.");
      return false;
    }

    setFormMessage("");
    return true;
  }

  function selectedBounds() {
    const from = Number(elements.yearFrom.value);
    const to = Number(elements.yearTo.value);
    return {
      from: Math.min(from, to),
      to: Math.max(from, to),
    };
  }

  function selectedRangeRecords(countryData) {
    const { from, to } = selectedBounds();
    const selected = new Set(selectedSexCodes());
    if (!countryData || !selected.size || !Number.isFinite(from) || !Number.isFinite(to)) {
      return [];
    }
    return countryData.records
      .filter(
        (record) =>
          selected.has(record.sex_code) &&
          record.year >= from &&
          record.year <= to
      )
      .sort((a, b) => a.year - b.year || a.sex_code.localeCompare(b.sex_code));
  }

  function selectedSeries() {
    const series = [
      {
        role: "primary",
        country: state.countryDataPrimary.country,
        records: selectedRangeRecords(state.countryDataPrimary),
      },
    ];
    if (mode() === "compare") {
      series.push({
        role: "secondary",
        country: state.countryDataSecondary.country,
        records: selectedRangeRecords(state.countryDataSecondary),
      });
    }
    return series;
  }

  function visualSeries(series) {
    if (elements.sexSelect.value === "integrated") {
      return series.map((item) => ({
        ...item,
        sexCode: "integrated",
        records: integratedRecords(item.records),
      }));
    }
    return series.flatMap((item) =>
      selectedSexCodes().map((sexCode) => ({
        ...item,
        sexCode,
        records: item.records.filter((record) => record.sex_code === sexCode),
      }))
    );
  }

  function yearsFor(item, sexCode) {
    return new Set(
      item.records
        .filter((record) => record.sex_code === sexCode)
        .map((record) => record.year)
    );
  }

  function intersectionSize(first, second) {
    return [...first].filter((value) => second.has(value)).length;
  }

  function completeBothSexYears(item) {
    const female = yearsFor(item, "female");
    const male = yearsFor(item, "male");
    return new Set([...female].filter((year) => male.has(year)));
  }

  function renderMetrics(series) {
    const { from, to } = selectedBounds();
    const totalYears = to - from + 1;
    const selection = elements.sexSelect.value;
    const both = selection === "both";
    const integrated = selection === "integrated";

    elements.metricLabelPeriod.textContent = "Periodo seleccionado";
    elements.metricPeriod.textContent = `${from}–${to}`;

    if (mode() === "single" && integrated) {
      const records = integratedRecords(series[0].records);
      const observedYears = new Set(records.map((record) => record.year));
      const latest = records.at(-1);
      elements.metricLabelObserved.textContent = "Años con total integrado";
      elements.metricObserved.textContent = `${observedYears.size} de ${totalYears}`;
      elements.metricLabelLatest.textContent = "Último total integrado";
      elements.metricLatest.textContent = latest
        ? `${numberFormatter.format(latest.death_count)} · ${latest.year}`
        : "Sin registro completo";
      elements.metricLabelMissing.textContent = "Años sin F + M completo";
      elements.metricMissing.textContent = numberFormatter.format(
        Math.max(0, totalYears - observedYears.size)
      );
      return;
    }

    if (mode() === "single" && !both) {
      const records = series[0].records;
      const observedYears = new Set(records.map((record) => record.year));
      const latest = records.at(-1);
      elements.metricLabelObserved.textContent = "Años observados";
      elements.metricObserved.textContent = `${observedYears.size} de ${totalYears}`;
      elements.metricLabelLatest.textContent = "Último registro";
      elements.metricLatest.textContent = latest
        ? `${numberFormatter.format(latest.death_count)} · ${latest.year}`
        : "Sin registro";
      elements.metricLabelMissing.textContent = "Años sin observación";
      elements.metricMissing.textContent = numberFormatter.format(
        Math.max(0, totalYears - observedYears.size)
      );
      return;
    }

    if (mode() === "single" && both) {
      const femaleYears = yearsFor(series[0], "female");
      const maleYears = yearsFor(series[0], "male");
      elements.metricLabelObserved.textContent = "Femenino: años observados";
      elements.metricObserved.textContent = `${femaleYears.size} de ${totalYears}`;
      elements.metricLabelLatest.textContent = "Masculino: años observados";
      elements.metricLatest.textContent = `${maleYears.size} de ${totalYears}`;
      elements.metricLabelMissing.textContent = "Años con ambos sexos";
      elements.metricMissing.textContent =
        `${intersectionSize(femaleYears, maleYears)} de ${totalYears}`;
      return;
    }

    if (mode() === "compare" && integrated) {
      const primaryIntegrated = integratedRecords(series[0].records);
      const secondaryIntegrated = integratedRecords(series[1].records);
      const primaryYears = new Set(primaryIntegrated.map((record) => record.year));
      const secondaryYears = new Set(secondaryIntegrated.map((record) => record.year));
      elements.metricLabelObserved.textContent =
        `${series[0].country.name_source}: años con F + M`;
      elements.metricObserved.textContent = `${primaryYears.size} de ${totalYears}`;
      elements.metricLabelLatest.textContent =
        `${series[1].country.name_source}: años con F + M`;
      elements.metricLatest.textContent = `${secondaryYears.size} de ${totalYears}`;
      elements.metricLabelMissing.textContent = "Años integrados en ambos países";
      elements.metricMissing.textContent =
        `${intersectionSize(primaryYears, secondaryYears)} de ${totalYears}`;
      return;
    }

    if (mode() === "compare" && !both) {
      const primaryYears = new Set(series[0].records.map((record) => record.year));
      const secondaryYears = new Set(series[1].records.map((record) => record.year));
      elements.metricLabelObserved.textContent =
        `${series[0].country.name_source}: años observados`;
      elements.metricObserved.textContent = `${primaryYears.size} de ${totalYears}`;
      elements.metricLabelLatest.textContent =
        `${series[1].country.name_source}: años observados`;
      elements.metricLatest.textContent = `${secondaryYears.size} de ${totalYears}`;
      elements.metricLabelMissing.textContent = "Años con datos en ambos";
      elements.metricMissing.textContent =
        `${intersectionSize(primaryYears, secondaryYears)} de ${totalYears}`;
      return;
    }

    const primaryComplete = completeBothSexYears(series[0]);
    const secondaryComplete = completeBothSexYears(series[1]);
    elements.metricLabelObserved.textContent =
      `${series[0].country.name_source}: años F y M`;
    elements.metricObserved.textContent = `${primaryComplete.size} de ${totalYears}`;
    elements.metricLabelLatest.textContent =
      `${series[1].country.name_source}: años F y M`;
    elements.metricLatest.textContent = `${secondaryComplete.size} de ${totalYears}`;
    elements.metricLabelMissing.textContent = "Años completos en ambos países";
    elements.metricMissing.textContent =
      `${intersectionSize(primaryComplete, secondaryComplete)} de ${totalYears}`;
  }

  function createSvgElement(name, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    return element;
  }

  function splitConsecutive(records) {
    const segments = [];
    let current = [];
    for (const record of records) {
      const previous = current.at(-1);
      if (previous && record.year - previous.year > 1) {
        segments.push(current);
        current = [];
      }
      current.push(record);
    }
    if (current.length) segments.push(current);
    return segments;
  }

  function renderLegend(items) {
    elements.chartLegend.replaceChildren();
    if (items.length <= 1) {
      elements.chartLegend.hidden = true;
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const entry = document.createElement("span");
      const line = document.createElement("i");
      line.className =
        `legend-line legend-line-${item.role} legend-line-${item.sexCode}`;
      line.setAttribute("aria-hidden", "true");
      const label = document.createElement("strong");
      label.textContent =
        `${item.country.name_source} · ${sexLabels[item.sexCode]}`;
      entry.append(line, label);
      fragment.append(entry);
    }
    elements.chartLegend.append(fragment);
    elements.chartLegend.hidden = false;
  }

  function appendDataPoint(svg, item, record, x, y) {
    const valueKind = item.sexCode === "integrated"
      ? "total integrado derivado"
      : "defunciones registradas";
    const ariaLabel =
      `${item.country.name_source}, ${sexLabels[item.sexCode]}, ${record.year}: ` +
      `${numberFormatter.format(record.death_count)} ${valueKind}`;
    const common = {
      class: `chart-point chart-point-${item.role} chart-point-${item.sexCode}`,
      tabindex: 0,
      role: "img",
      "aria-label": ariaLabel,
    };
    let point;
    if (item.sexCode === "male") {
      point = createSvgElement("rect", {
        x: x(record.year) - 4.5,
        y: y(record.death_count) - 4.5,
        width: 9,
        height: 9,
        rx: 1.2,
        ...common,
      });
    } else if (item.sexCode === "integrated") {
      const centerX = x(record.year);
      const centerY = y(record.death_count);
      point = createSvgElement("polygon", {
        points: `${centerX},${centerY - 6} ${centerX + 6},${centerY} ` +
          `${centerX},${centerY + 6} ${centerX - 6},${centerY}`,
        ...common,
      });
    } else {
      point = createSvgElement("circle", {
        cx: x(record.year),
        cy: y(record.death_count),
        r: 5,
        ...common,
      });
    }
    const tooltip = createSvgElement("title");
    tooltip.textContent = ariaLabel;
    point.append(tooltip);
    svg.append(point);
  }

  function renderChart(series) {
    const svg = elements.chart;
    const title = elements.chartTitle;
    const description = elements.chartDescription;
    svg.replaceChildren(title, description);

    const lines = visualSeries(series);
    const allRecords = lines.flatMap((item) => item.records);
    if (!allRecords.length) {
      svg.hidden = true;
      elements.chartEmpty.hidden = false;
      elements.chartLegend.hidden = true;
      return;
    }

    svg.hidden = false;
    elements.chartEmpty.hidden = true;

    const width = 960;
    const height = 380;
    const margin = { top: 28, right: 28, bottom: 54, left: 72 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const { from, to } = selectedBounds();
    const maxValue = Math.max(1, ...allRecords.map((record) => record.death_count));
    const magnitude = 10 ** Math.floor(Math.log10(maxValue));
    const step = Math.max(1, Math.ceil(maxValue / (5 * magnitude)) * magnitude);
    const yMax = Math.max(step, Math.ceil(maxValue / step) * step);

    const x = (year) =>
      margin.left + ((year - from) / Math.max(1, to - from)) * innerWidth;
    const y = (value) =>
      margin.top + innerHeight - (value / yMax) * innerHeight;

    const yTicks = 5;
    for (let index = 0; index <= yTicks; index += 1) {
      const value = Math.round((yMax / yTicks) * index);
      const yPosition = y(value);
      svg.append(createSvgElement("line", {
        x1: margin.left,
        x2: width - margin.right,
        y1: yPosition,
        y2: yPosition,
        class: "chart-grid",
      }));
      const label = createSvgElement("text", {
        x: margin.left - 12,
        y: yPosition + 4,
        "text-anchor": "end",
        class: "chart-label",
      });
      label.textContent = numberFormatter.format(value);
      svg.append(label);
    }

    const tickCount = Math.min(8, Math.max(2, to - from + 1));
    const usedYears = new Set();
    for (let index = 0; index < tickCount; index += 1) {
      const year = Math.round(from + ((to - from) * index) / Math.max(1, tickCount - 1));
      if (usedYears.has(year)) continue;
      usedYears.add(year);
      const xPosition = x(year);
      svg.append(createSvgElement("line", {
        x1: xPosition,
        x2: xPosition,
        y1: margin.top,
        y2: height - margin.bottom,
        class: "chart-grid",
      }));
      const label = createSvgElement("text", {
        x: xPosition,
        y: height - margin.bottom + 28,
        "text-anchor": "middle",
        class: "chart-label",
      });
      label.textContent = year;
      svg.append(label);
    }

    svg.append(createSvgElement("line", {
      x1: margin.left,
      x2: width - margin.right,
      y1: height - margin.bottom,
      y2: height - margin.bottom,
      class: "chart-axis",
    }));

    for (const item of lines) {
      for (const segment of splitConsecutive(item.records)) {
        if (segment.length > 1) {
          svg.append(createSvgElement("polyline", {
            points: segment
              .map((record) => `${x(record.year)},${y(record.death_count)}`)
              .join(" "),
            class:
              `chart-line chart-line-${item.role} chart-line-${item.sexCode}`,
          }));
        }
      }
      for (const record of item.records) {
        appendDataPoint(svg, item, record, x, y);
      }
    }

    renderLegend(lines);
    const sex = sexLabels[elements.sexSelect.value] || elements.sexSelect.value;
    const countryNames = series.map((item) => item.country.name_source).join(" y ");
    title.textContent = `${countryNames}, ${sex}, ${from}–${to}`;
    if (elements.sexSelect.value === "integrated") {
      description.textContent =
        `${lines.length} series con ${allRecords.length} totales derivados. ` +
        "Cada punto suma femenino y masculino del mismo país y año; la categoría " +
        "desconocido no se incluye. Las líneas se interrumpen si falta un componente.";
    } else if (elements.sexSelect.value === "both") {
      description.textContent =
        `${lines.length} series con ${allRecords.length} observaciones. ` +
        "El color distingue países; la línea continua corresponde a femenino y " +
        "la discontinua a masculino. Las líneas se interrumpen cuando faltan años.";
    } else {
      description.textContent =
        `${lines.length} series con ${allRecords.length} observaciones. ` +
        "El color distingue países y las líneas se interrumpen cuando faltan años.";
    }
  }

  function appendHeader(labels) {
    const row = document.createElement("tr");
    for (const label of labels) {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = label;
      row.append(cell);
    }
    elements.recordsHead.replaceChildren(row);
  }

  function appendCell(row, value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (className) cell.className = className;
    row.append(cell);
  }

  function appendStatusCell(row, text, className = "") {
    const cell = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = `status-pill${className ? ` ${className}` : ""}`;
    pill.textContent = text;
    cell.append(pill);
    row.append(cell);
  }

  function recordMap(item) {
    return new Map(
      item.records.map((record) => [`${record.year}:${record.sex_code}`, record])
    );
  }

  function renderSingleTableOneSex(series) {
    appendHeader(["Año", "Sexo", "Defunciones registradas", "Estado"]);
    elements.recordsBody.replaceChildren();
    const fragment = document.createDocumentFragment();
    for (const record of [...series[0].records].sort((a, b) => b.year - a.year)) {
      const row = document.createElement("tr");
      appendCell(row, String(record.year));
      appendCell(row, sexLabels[record.sex_code] || record.sex_code);
      appendCell(row, numberFormatter.format(record.death_count), "numeric-cell");
      appendStatusCell(row, "Registrado");
      fragment.append(row);
    }
    elements.recordsBody.append(fragment);
    elements.tableCaption.textContent =
      `${series[0].records.length} observaciones disponibles. ` +
      "Los años ausentes no aparecen como cero.";
  }

  function renderSingleTableBoth(series) {
    appendHeader(["Año", "Femenino", "Masculino", "Disponibilidad"]);
    elements.recordsBody.replaceChildren();
    const records = recordMap(series[0]);
    const { from, to } = selectedBounds();
    const fragment = document.createDocumentFragment();
    for (let year = to; year >= from; year -= 1) {
      const female = records.get(`${year}:female`);
      const male = records.get(`${year}:male`);
      const row = document.createElement("tr");
      appendCell(row, String(year));
      appendCell(row, female ? numberFormatter.format(female.death_count) : "—", "numeric-cell");
      appendCell(row, male ? numberFormatter.format(male.death_count) : "—", "numeric-cell");
      if (female && male) appendStatusCell(row, "F y M");
      else if (female) appendStatusCell(row, "Solo femenino", "status-pill-primary");
      else if (male) appendStatusCell(row, "Solo masculino", "status-pill-secondary");
      else appendStatusCell(row, "Sin observación", "status-pill-missing");
      fragment.append(row);
    }
    elements.recordsBody.append(fragment);
    elements.tableCaption.textContent =
      "Femenino y masculino se muestran por separado. El guion indica ausencia, no cero.";
  }

  function renderComparisonTableOneSex(series) {
    const primaryName = series[0].country.name_source;
    const secondaryName = series[1].country.name_source;
    appendHeader(["Año", primaryName, secondaryName, "Disponibilidad"]);
    elements.recordsBody.replaceChildren();
    const primaryByYear = new Map(series[0].records.map((record) => [record.year, record]));
    const secondaryByYear = new Map(series[1].records.map((record) => [record.year, record]));
    const { from, to } = selectedBounds();
    const fragment = document.createDocumentFragment();
    for (let year = to; year >= from; year -= 1) {
      const primary = primaryByYear.get(year);
      const secondary = secondaryByYear.get(year);
      const row = document.createElement("tr");
      appendCell(row, String(year));
      appendCell(row, primary ? numberFormatter.format(primary.death_count) : "—", "numeric-cell");
      appendCell(row, secondary ? numberFormatter.format(secondary.death_count) : "—", "numeric-cell");
      if (primary && secondary) appendStatusCell(row, "Ambos países");
      else if (primary) appendStatusCell(row, `Solo ${primaryName}`, "status-pill-primary");
      else if (secondary) appendStatusCell(row, `Solo ${secondaryName}`, "status-pill-secondary");
      else appendStatusCell(row, "Sin observación", "status-pill-missing");
      fragment.append(row);
    }
    elements.recordsBody.append(fragment);
    elements.tableCaption.textContent =
      "El guion indica ausencia de observación; nunca representa cero.";
  }

  function renderComparisonTableBoth(series) {
    const primaryName = series[0].country.name_source;
    const secondaryName = series[1].country.name_source;
    appendHeader([
      "Año",
      `${primaryName} · F`,
      `${primaryName} · M`,
      `${secondaryName} · F`,
      `${secondaryName} · M`,
      "Cobertura",
    ]);
    elements.recordsBody.replaceChildren();
    const primary = recordMap(series[0]);
    const secondary = recordMap(series[1]);
    const { from, to } = selectedBounds();
    const fragment = document.createDocumentFragment();
    for (let year = to; year >= from; year -= 1) {
      const values = [
        primary.get(`${year}:female`),
        primary.get(`${year}:male`),
        secondary.get(`${year}:female`),
        secondary.get(`${year}:male`),
      ];
      const row = document.createElement("tr");
      appendCell(row, String(year));
      for (const record of values) {
        appendCell(row, record ? numberFormatter.format(record.death_count) : "—", "numeric-cell");
      }
      const available = values.filter(Boolean).length;
      appendStatusCell(
        row,
        available === 4 ? "4 de 4" : available ? `${available} de 4` : "Sin observación",
        available === 0 ? "status-pill-missing" : ""
      );
      fragment.append(row);
    }
    elements.recordsBody.append(fragment);
    elements.tableCaption.textContent =
      "F y M son series independientes. No se suman sexos ni países.";
  }

  function renderSingleTableIntegrated(series) {
    appendHeader(["Año", "Femenino", "Masculino", "Total integrado", "Disponibilidad"]);
    elements.recordsBody.replaceChildren();
    const records = recordMap(series[0]);
    const { from, to } = selectedBounds();
    const fragment = document.createDocumentFragment();
    for (let year = to; year >= from; year -= 1) {
      const female = records.get(`${year}:female`);
      const male = records.get(`${year}:male`);
      const row = document.createElement("tr");
      appendCell(row, String(year));
      appendCell(row, female ? numberFormatter.format(female.death_count) : "—", "numeric-cell");
      appendCell(row, male ? numberFormatter.format(male.death_count) : "—", "numeric-cell");
      appendCell(
        row,
        female && male
          ? numberFormatter.format(female.death_count + male.death_count)
          : "—",
        "numeric-cell"
      );
      if (female && male) appendStatusCell(row, "F + M completo");
      else if (female || male) appendStatusCell(row, "Total no calculable", "status-pill-missing");
      else appendStatusCell(row, "Sin observación", "status-pill-missing");
      fragment.append(row);
    }
    elements.recordsBody.append(fragment);
    elements.tableCaption.textContent =
      "El total se calcula solo cuando existen femenino y masculino en el mismo año. " +
      "No incluye sexo desconocido y el guion nunca representa cero.";
  }

  function renderComparisonTableIntegrated(series) {
    const primaryName = series[0].country.name_source;
    const secondaryName = series[1].country.name_source;
    appendHeader(["Año", `${primaryName} · Total F + M`, `${secondaryName} · Total F + M`, "Disponibilidad"]);
    elements.recordsBody.replaceChildren();
    const primary = new Map(integratedRecords(series[0].records).map((record) => [record.year, record]));
    const secondary = new Map(integratedRecords(series[1].records).map((record) => [record.year, record]));
    const { from, to } = selectedBounds();
    const fragment = document.createDocumentFragment();
    for (let year = to; year >= from; year -= 1) {
      const first = primary.get(year);
      const second = secondary.get(year);
      const row = document.createElement("tr");
      appendCell(row, String(year));
      appendCell(row, first ? numberFormatter.format(first.death_count) : "—", "numeric-cell");
      appendCell(row, second ? numberFormatter.format(second.death_count) : "—", "numeric-cell");
      if (first && second) appendStatusCell(row, "Ambos países");
      else if (first) appendStatusCell(row, `Solo ${primaryName}`, "status-pill-primary");
      else if (second) appendStatusCell(row, `Solo ${secondaryName}`, "status-pill-secondary");
      else appendStatusCell(row, "Sin total integrado", "status-pill-missing");
      fragment.append(row);
    }
    elements.recordsBody.append(fragment);
    elements.tableCaption.textContent =
      "Cada valor es F + M del mismo país y año. No se suman países ni se incluye sexo desconocido.";
  }

  function renderTable(series) {
    const selection = elements.sexSelect.value;
    const both = selection === "both";
    const integrated = selection === "integrated";
    if (mode() === "single" && integrated) renderSingleTableIntegrated(series);
    else if (mode() === "compare" && integrated) renderComparisonTableIntegrated(series);
    else if (mode() === "single" && !both) renderSingleTableOneSex(series);
    else if (mode() === "single") renderSingleTableBoth(series);
    else if (!both) renderComparisonTableOneSex(series);
    else renderComparisonTableBoth(series);
  }

  function updateUrl() {
    const parameters = new URLSearchParams();
    if (mode() === "compare") parameters.set("mode", "compare");
    if (elements.countrySelect.value) parameters.set("country", elements.countrySelect.value);
    if (mode() === "compare" && elements.countrySelect2.value) {
      parameters.set("country2", elements.countrySelect2.value);
    }
    if (elements.sexSelect.value) parameters.set("sex", elements.sexSelect.value);
    if (elements.yearFrom.value) parameters.set("from", elements.yearFrom.value);
    if (elements.yearTo.value) parameters.set("to", elements.yearTo.value);

    // Algunos visores de VS Code y la apertura directa mediante file://
    // asignan un origen opaco. En ese contexto replaceState puede lanzar
    // SecurityError aunque los datos ya se hayan cargado correctamente.
    if (location.protocol === "file:" || location.origin === "null") return;

    try {
      history.replaceState(
        null,
        "",
        `${location.pathname}${parameters.size ? `?${parameters}` : ""}`
      );
    } catch (error) {
      console.warn("No fue posible actualizar la URL compartible.", error);
    }
  }

  function updateResults() {
    if (!validateSelection()) {
      clearResults();
      updateUrl();
      return;
    }
    const series = selectedSeries();
    state.selectedSeries = series;
    const sex = sexLabels[elements.sexSelect.value] || elements.sexSelect.value;
    elements.results.hidden = false;
    if (mode() === "compare") {
      elements.resultTitle.textContent =
        `${series[0].country.name_source} y ${series[1].country.name_source}`;
      elements.resultSubtitle.textContent =
        `${sex} · comparación de conteos registrados · ` +
        "homicidio intencional ICD-10 X85–Y09 · edades 0–14";
    } else {
      elements.resultTitle.textContent = series[0].country.name_source;
      elements.resultSubtitle.textContent =
        `${sex} · homicidio intencional ICD-10 X85–Y09 · edades 0–14`;
    }
    renderMetrics(series);
    renderChart(series);
    renderTable(series);
    updateUrl();
  }

  function refreshSharedControls(preferred = {}) {
    populateSexes(preferred.sex);
    if (!validateSelection()) {
      elements.yearFrom.replaceChildren();
      elements.yearTo.replaceChildren();
      elements.yearFrom.disabled = true;
      elements.yearTo.disabled = true;
      clearResults();
      updateUrl();
      return;
    }
    populateYears(preferred.from, preferred.to);
    updateResults();
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function downloadSelection() {
    if (!state.selectedSeries.length) return;
    const integrated = elements.sexSelect.value === "integrated";
    const rows = integrated
      ? [[
          "comparison_role",
          "country_code",
          "country_name_source",
          "year",
          "selection_code",
          "selection_label_es",
          "death_count",
          "female_death_count",
          "male_death_count",
          "derivation",
          "age_scope",
          "cause_code",
          "female_record_id",
          "male_record_id",
        ]]
      : [[
          "comparison_role",
          "country_code",
          "country_name_source",
          "year",
          "sex_code",
          "sex_label_es",
          "death_count",
          "age_scope",
          "cause_code",
          "record_id",
        ]];

    for (const item of state.selectedSeries) {
      const records = integrated ? integratedRecords(item.records) : item.records;
      for (const record of records) {
        if (integrated) {
          rows.push([
            item.role,
            item.country.code,
            item.country.name_source,
            record.year,
            "integrated_female_male",
            sexLabels.integrated,
            record.death_count,
            record.female_death_count,
            record.male_death_count,
            "female + male; requires both; excludes unknown",
            "under_15_partial",
            "X85-Y09",
            record.female_record_id,
            record.male_record_id,
          ]);
        } else {
          rows.push([
            item.role,
            item.country.code,
            item.country.name_source,
            record.year,
            record.sex_code,
            sexLabels[record.sex_code] || record.sex_code,
            record.death_count,
            "under_15_partial",
            "X85-Y09",
            record.record_id,
          ]);
        }
      }
    }
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const primaryCode = state.selectedSeries[0].country.code;
    const secondaryPart = mode() === "compare"
      ? `_vs_${state.selectedSeries[1].country.code}`
      : "";
    link.href = url;
    link.download =
      `radix_homicidios_0_14_${primaryCode}${secondaryPart}_` +
      `${elements.sexSelect.value}_${elements.yearFrom.value}_` +
      `${elements.yearTo.value}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function loadPrimary(code, preferred = {}) {
    if (!code) {
      state.countryDataPrimary = null;
      refreshSecondaryOptions();
      refreshSharedControls(preferred);
      return;
    }
    const meta = countryMeta(code);
    setStatus(`Cargando ${meta?.name_source || "país"}…`);
    state.countryDataPrimary = await fetchCountry(code);
    refreshSecondaryOptions();
    refreshSharedControls(preferred);
  }

  async function loadSecondary(code, preferred = {}) {
    if (!code) {
      state.countryDataSecondary = null;
      refreshSharedControls(preferred);
      return;
    }
    const meta = countryMeta(code);
    setStatus(`Cargando ${meta?.name_source || "segundo país"}…`);
    state.countryDataSecondary = await fetchCountry(code);
    refreshSharedControls(preferred);
  }

  function applyMode(nextMode, preferred = {}) {
    const compare = nextMode === "compare";
    elements.modeInputs.forEach((input) => {
      input.checked = input.value === nextMode;
    });
    elements.comparisonPanel.hidden = !compare;
    elements.countrySelect2.disabled = !compare || !state.index;
    if (!compare) setFormMessage("");
    else refreshSecondaryOptions();
    refreshSharedControls(preferred);
  }

  function baseStatus() {
    setStatus(
      `${state.index.coverage.country_count} países o territorios · ` +
      `${state.index.coverage.record_count.toLocaleString("es-CO")} registros nacionales`
    );
  }

  async function initialize() {
    try {
      if (window.RADIX_HOMICIDE_DATA?.index) {
        state.index = window.RADIX_HOMICIDE_DATA.index;
      } else {
        const response = await fetch(DATA_INDEX_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        state.index = await response.json();
      }
      state.countries = state.index.countries;
      state.filteredPrimary = [...state.countries];
      state.filteredSecondary = [...state.countries];
      renderCountryOptions(elements.countrySelect, state.countries);
      renderCountryOptions(elements.countrySelect2, state.countries);
      elements.countrySelect.disabled = false;
      baseStatus();

      const parameters = new URLSearchParams(location.search);
      const requestedMode = parameters.get("mode") === "compare" ? "compare" : "single";
      const requestedCountry = parameters.get("country");
      const requestedCountry2 = parameters.get("country2");
      const preferred = {
        sex: parameters.get("sex"),
        from: parameters.get("from"),
        to: parameters.get("to"),
      };

      elements.comparisonPanel.hidden = requestedMode !== "compare";
      elements.countrySelect2.disabled = requestedMode !== "compare";
      elements.modeInputs.forEach((input) => {
        input.checked = input.value === requestedMode;
      });

      if (requestedCountry && state.countries.some((country) => country.code === requestedCountry)) {
        elements.countrySelect.value = requestedCountry;
        state.countryDataPrimary = await fetchCountry(requestedCountry);
      }
      refreshSecondaryOptions();
      if (
        requestedMode === "compare" &&
        requestedCountry2 &&
        requestedCountry2 !== requestedCountry &&
        state.countries.some((country) => country.code === requestedCountry2)
      ) {
        elements.countrySelect2.value = requestedCountry2;
        state.countryDataSecondary = await fetchCountry(requestedCountry2);
      }
      refreshSharedControls(preferred);
      baseStatus();
    } catch (error) {
      clearResults();
      setStatus(
        "No fue posible cargar los datos. Abra la carpeta mediante un servidor local.",
        true
      );
      console.error(error);
    }
  }

  elements.countrySearch.addEventListener("input", filterPrimaryCountries);
  elements.countrySearch2.addEventListener("input", filterSecondaryCountries);
  elements.modeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) applyMode(input.value);
    });
  });
  elements.countrySelect.addEventListener("change", async () => {
    try {
      await loadPrimary(elements.countrySelect.value);
      baseStatus();
    } catch (error) {
      clearResults();
      setStatus(
        "No fue posible cargar el archivo del país A. Use un servidor local o GitHub Pages.",
        true
      );
      console.error(error);
    }
  });
  elements.countrySelect2.addEventListener("change", async () => {
    try {
      await loadSecondary(elements.countrySelect2.value);
      baseStatus();
    } catch (error) {
      clearResults();
      setStatus(
        "No fue posible cargar el archivo del país B. Use un servidor local o GitHub Pages.",
        true
      );
      console.error(error);
    }
  });
  elements.sexSelect.addEventListener("change", () => {
    populateYears();
    updateResults();
  });
  elements.yearFrom.addEventListener("change", () => {
    if (Number(elements.yearFrom.value) > Number(elements.yearTo.value)) {
      elements.yearTo.value = elements.yearFrom.value;
    }
    updateResults();
  });
  elements.yearTo.addEventListener("change", () => {
    if (Number(elements.yearTo.value) < Number(elements.yearFrom.value)) {
      elements.yearFrom.value = elements.yearTo.value;
    }
    updateResults();
  });
  elements.downloadButton.addEventListener("click", downloadSelection);
  initialize();
})();

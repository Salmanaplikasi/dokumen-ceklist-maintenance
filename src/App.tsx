import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FolderArchive,
  Plus,
} from 'lucide-react';
import { checklistData } from './data/checklistData';
import { DEFAULT_FIELDDOC_ORG } from './data/fieldDocAssets';
import {
  ChecklistItemOverride,
  ChecklistResponse,
  ChecklistStatus,
  ChecklistTemplateItem,
  FilterState,
  Frequency,
  InspectionMeta,
  PersistedChecklistState,
} from './types/checklist';
import type { CloudConnectionState, FieldDocReport } from './types/fielddoc';
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  NewItemInput,
  applyItemOverrides,
  applySetAllOk,
  calculateProgress,
  createDefaultMeta,
  createManualChecklistItem,
  filterChecklistItems,
  getAllFrequenciesList,
  getAvailableFrequencies,
  getUniqueEquipmentCategories,
  getUniqueTaskCategories,
  mergeItemsWithResponses,
  parsePersistedState,
} from './utils/checklistLogic';
import {
  exportStandaloneHtml,
  exportToExcel,
  exportToPdf,
  exportToWord,
} from './utils/exporters';
import {
  FDOC_KEYS,
  createBlankSlot,
  createFreshFieldDocReport,
  todayIso,
} from './utils/fieldDocLogic';
import {
  FieldDocStorageEngine,
  checkUrlAutoConnectConfig,
  clearPrivateCloudConfig,
  getPrivateCloudConfig,
  getSanitizedLocalReports,
  initPrivateFirebaseConnection,
  savePrivateCloudConfig,
  stopPrivateFirebaseConnection,
} from './utils/fieldDocStorage';
import { exportFieldDocFile } from './utils/fieldDocExport';
import {
  fetchLiveGpsCoords,
  getInitialGpsString,
  getLastKnownOnlinePos,
  saveLastKnownOnlinePos,
} from './utils/fieldDocWatermark';
import { ActiveAppModule, HeaderBar } from './components/HeaderBar';
import { InspectionMetaCard } from './components/InspectionMetaCard';
import { FilterToolbar } from './components/FilterToolbar';
import { ProgressBanner } from './components/ProgressBanner';
import { ChecklistCard } from './components/ChecklistCard';
import { ExportFooterBar } from './components/ExportFooterBar';
import { AddItemModal } from './components/AddItemModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { PrintReport } from './components/PrintReport';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { FieldDocWorkspace } from './components/FieldDocWorkspace';
import { FieldDocArchiveView } from './components/FieldDocArchiveView';
import {
  FieldDocCloudModal,
  FieldDocConfirmModal,
  FieldDocProfileModal,
} from './components/FieldDocModals';
import { OfflineIndicator } from './components/PWAControls';

function loadInitialState(): PersistedChecklistState {
  if (typeof window !== 'undefined') {
    try {
      const restored = parsePersistedState(window.localStorage.getItem(STORAGE_KEY));
      if (restored) {
        return restored;
      }
    } catch {
      // Ignore storage access errors in restricted environments
    }
  }
  return {
    version: STORAGE_VERSION,
    meta: createDefaultMeta(),
    responses: {},
    customItems: [],
    itemOverrides: {},
    selectedEquipment: 'Chilled Water Pump',
    selectedFrequency: 'Monthly',
    lastSavedAt: new Date().toISOString(),
  };
}

function readLocalPref(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = window.localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch {
    return fallback;
  }
}

function loadInitialFieldDocReport(): FieldDocReport {
  return createFreshFieldDocReport({
    org: readLocalPref(FDOC_KEYS.orgHeader, DEFAULT_FIELDDOC_ORG),
    site: readLocalPref(FDOC_KEYS.sitePrefix, ''),
    wmLoc: readLocalPref(FDOC_KEYS.wmLoc, 'Area Fasilitas Utama'),
    wmGps: typeof window !== 'undefined' ? getInitialGpsString() : '',
    author: readLocalPref(FDOC_KEYS.engineerName, 'M. Salman. A'),
    email: readLocalPref(FDOC_KEYS.engineerEmail, 'Teknisi Lapangan'),
    date: todayIso(),
  });
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveAppModule>('checklist');

  // --- Checklist Maintenance State ---
  const [initial] = useState<PersistedChecklistState>(() => loadInitialState());
  const [meta, setMeta] = useState<InspectionMeta>(initial.meta);
  const [responses, setResponses] = useState<Record<string, ChecklistResponse>>(
    initial.responses
  );
  const [customItems, setCustomItems] = useState<ChecklistTemplateItem[]>(
    initial.customItems
  );
  const [itemOverrides, setItemOverrides] = useState<
    Record<string, ChecklistItemOverride>
  >(initial.itemOverrides);
  const [filter, setFilter] = useState<FilterState>({
    equipmentCategory: initial.selectedEquipment,
    frequency: initial.selectedFrequency,
    searchQuery: '',
    statusFilter: 'ALL',
  });
  const [lastSavedAt, setLastSavedAt] = useState<string>(initial.lastSavedAt);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistTemplateItem | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  // --- FieldDoc State ---
  const [fieldDocReport, setFieldDocReport] = useState<FieldDocReport>(() =>
    loadInitialFieldDocReport()
  );
  const [archiveReports, setArchiveReports] = useState<FieldDocReport[]>(() =>
    typeof window !== 'undefined' ? getSanitizedLocalReports() : []
  );
  const [cloudStatus, setCloudStatus] = useState<CloudConnectionState>({
    mode: 'local',
    label: 'Penyimpanan Lokal',
  });
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineReady, setOfflineReady] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [busyFieldDocExport, setBusyFieldDocExport] = useState(false);
  const [isFieldDocProfileOpen, setIsFieldDocProfileOpen] = useState(false);
  const [isFieldDocCloudOpen, setIsFieldDocCloudOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const [toastState, setToastState] = useState<{
    message: string;
    isError?: boolean;
  } | null>(null);

  const latestReportRef = useRef(fieldDocReport);
  latestReportRef.current = fieldDocReport;

  const showToast = useCallback((message: string, isError = false) => {
    setToastState({ message, isError });
  }, []);

  useEffect(() => {
    if (!toastState) return;
    const timer = window.setTimeout(() => setToastState(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastState]);

  // Auto-save Checklist state to localStorage
  useEffect(() => {
    const nowIso = new Date().toISOString();
    const payload: PersistedChecklistState = {
      version: STORAGE_VERSION,
      meta,
      responses,
      customItems,
      itemOverrides,
      selectedEquipment: filter.equipmentCategory,
      selectedFrequency: filter.frequency,
      lastSavedAt: nowIso,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastSavedAt(nowIso);
    } catch {
      // Ignore storage quota errors
    }
  }, [meta, responses, customItems, itemOverrides, filter.equipmentCategory, filter.frequency]);

  // Persist FieldDoc settings & auto-save active report when title is filled
  useEffect(() => {
    try {
      window.localStorage.setItem(FDOC_KEYS.orgHeader, fieldDocReport.org);
      window.localStorage.setItem(FDOC_KEYS.sitePrefix, fieldDocReport.site.trim());
      window.localStorage.setItem(FDOC_KEYS.wmLoc, fieldDocReport.wmLoc);
      window.localStorage.setItem(FDOC_KEYS.wmGps, fieldDocReport.wmGps);
      if (fieldDocReport.wmGps.trim()) {
        const cached = getLastKnownOnlinePos();
        if (!cached || cached.formatted !== fieldDocReport.wmGps.trim()) {
          saveLastKnownOnlinePos('', '', 0, '', fieldDocReport.wmGps.trim());
        }
      }
    } catch {
      // Ignore
    }

    if (!fieldDocReport.title.trim()) return;
    const timer = window.setTimeout(() => {
      void FieldDocStorageEngine.saveReport(fieldDocReport).then((saved) => {
        setFieldDocReport((prev) =>
          prev.id === saved.id ? prev : { ...prev, id: saved.id }
        );
        setArchiveReports(getSanitizedLocalReports());
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [fieldDocReport]);

  // Initialize FieldDoc Cloud Sync & Online/Offline GPS handlers
  useEffect(() => {
    checkUrlAutoConnectConfig();

    const connectCloud = async () => {
      await initPrivateFirebaseConnection(
        (cloudList) => {
          setArchiveReports(cloudList);
        },
        (status) => {
          setCloudStatus(status);
        }
      );
      setArchiveReports((prev) => FieldDocStorageEngine.getReports(prev));
    };

    void connectCloud();

    const handleOnline = async () => {
      setIsOnline(true);
      showToast('Terhubung ke internet. Menyinkronkan FieldDoc otomatis...');
      await connectCloud();
      const current = latestReportRef.current;
      if (current.title.trim()) {
        const saved = await FieldDocStorageEngine.saveReport(current);
        setFieldDocReport((prev) => ({ ...prev, id: saved.id }));
        setArchiveReports(getSanitizedLocalReports());
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      const cached = getLastKnownOnlinePos();
      if (cached?.formatted) {
        setFieldDocReport((prev) => ({
          ...prev,
          wmGps: prev.wmGps.trim() ? prev.wmGps : cached.formatted,
        }));
      }
    };

    const handleOfflineReady = () => {
      setOfflineReady(true);
      showToast('Aplikasi sudah tersimpan di cache & siap dipakai offline.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pwa:offline-ready', handleOfflineReady);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pwa:offline-ready', handleOfflineReady);
      stopPrivateFirebaseConnection();
    };
  }, [showToast]);

  // --- Checklist Computed Data ---
  const allTemplateItems = useMemo(() => {
    const baseWithOverrides = applyItemOverrides(checklistData, itemOverrides);
    return [...baseWithOverrides, ...customItems];
  }, [itemOverrides, customItems]);

  const equipmentCategories = useMemo(
    () => getUniqueEquipmentCategories(allTemplateItems),
    [allTemplateItems]
  );

  const allFrequencies = useMemo(
    () => getAllFrequenciesList(allTemplateItems),
    [allTemplateItems]
  );

  const taskCategories = useMemo(
    () => getUniqueTaskCategories(allTemplateItems),
    [allTemplateItems]
  );

  const equipmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allTemplateItems) {
      counts[item.equipmentCategory] = (counts[item.equipmentCategory] ?? 0) + 1;
    }
    return counts;
  }, [allTemplateItems]);

  const availableFrequencies = useMemo(
    () => getAvailableFrequencies(allTemplateItems, filter.equipmentCategory),
    [allTemplateItems, filter.equipmentCategory]
  );

  const mergedItems = useMemo(
    () => mergeItemsWithResponses(allTemplateItems, responses),
    [allTemplateItems, responses]
  );

  const scopeItems = useMemo(
    () =>
      filterChecklistItems(mergedItems, {
        equipmentCategory: filter.equipmentCategory,
        frequency: filter.frequency,
        searchQuery: '',
        statusFilter: 'ALL',
      }),
    [mergedItems, filter.equipmentCategory, filter.frequency]
  );

  const visibleItems = useMemo(
    () => filterChecklistItems(mergedItems, filter),
    [mergedItems, filter]
  );

  const progress = useMemo(() => calculateProgress(scopeItems), [scopeItems]);

  const lastSavedLabel = useMemo(() => {
    try {
      const date = new Date(lastSavedAt);
      const timeStr = date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return `Tersimpan otomatis di perangkat · ${timeStr}`;
    } catch {
      return 'Tersimpan otomatis di perangkat';
    }
  }, [lastSavedAt]);

  // --- Checklist Handlers ---
  const handleMetaChange = useCallback((patch: Partial<InspectionMeta>) => {
    setMeta((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleEquipmentChange = useCallback(
    (nextEquipment: string) => {
      const avail = getAvailableFrequencies(allTemplateItems, nextEquipment);
      setFilter((prev) => {
        let nextFreq = prev.frequency;
        if (avail.length > 0 && nextFreq !== 'ALL' && !avail.includes(nextFreq)) {
          nextFreq = avail[0];
        }
        return {
          ...prev,
          equipmentCategory: nextEquipment,
          frequency: nextFreq,
          statusFilter: 'ALL',
        };
      });
    },
    [allTemplateItems]
  );

  const handleFrequencyChange = useCallback((nextFrequency: Frequency | 'ALL') => {
    setFilter((prev) => ({ ...prev, frequency: nextFrequency }));
  }, []);

  const handleSelectStatus = useCallback((id: string, status: ChecklistStatus) => {
    setResponses((prev) => ({
      ...prev,
      [id]: {
        status,
        remarks: prev[id]?.remarks ?? '',
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const handleChangeRemarks = useCallback((id: string, remarks: string) => {
    setResponses((prev) => ({
      ...prev,
      [id]: {
        status: prev[id]?.status ?? '',
        remarks,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const handleSetAllOk = useCallback(() => {
    if (visibleItems.length === 0) return;
    setResponses((prev) => applySetAllOk(visibleItems, prev, false));
    showToast(`${visibleItems.length} tugas pada tampilan ini diset ke OK.`);
  }, [visibleItems, showToast]);

  const handleSaveItem = useCallback(
    (input: NewItemInput, editingId?: string) => {
      const cleaned: ChecklistItemOverride = {
        equipmentCategory: input.equipmentCategory.trim(),
        frequency: input.frequency.trim(),
        category: input.category.trim(),
        taskDescription: input.taskDescription.trim(),
      };

      if (editingId) {
        const isCustom = customItems.some((c) => c.id === editingId);
        if (isCustom) {
          setCustomItems((prev) =>
            prev.map((item) =>
              item.id === editingId ? { ...item, ...cleaned } : item
            )
          );
        } else {
          setItemOverrides((prev) => ({
            ...prev,
            [editingId]: cleaned,
          }));
        }
        setFilter((prev) => ({
          ...prev,
          equipmentCategory: cleaned.equipmentCategory,
          frequency: cleaned.frequency,
          searchQuery: '',
          statusFilter: 'ALL',
        }));
        showToast(
          `Perubahan item disimpan ke ${cleaned.equipmentCategory} (${cleaned.frequency}).`
        );
        return;
      }

      const created = createManualChecklistItem(cleaned);
      setCustomItems((prev) => [...prev, created]);
      setFilter((prev) => ({
        ...prev,
        equipmentCategory: created.equipmentCategory,
        frequency: created.frequency,
        searchQuery: '',
        statusFilter: 'ALL',
      }));
      showToast(
        `Item baru ditambahkan ke ${created.equipmentCategory} (${created.frequency}).`
      );
    },
    [customItems, showToast]
  );

  const handleOpenAddModal = useCallback(() => {
    setEditingItem(null);
    setIsAddModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((item: ChecklistTemplateItem) => {
    setEditingItem(item);
    setIsAddModalOpen(true);
  }, []);

  const handleDeleteCustomItem = useCallback(
    (id: string) => {
      setCustomItems((prev) => prev.filter((item) => item.id !== id));
      setResponses((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      showToast('Item checklist manual dihapus.');
    },
    [showToast]
  );

  const handleResetCurrentView = useCallback(() => {
    setResponses((prev) => {
      const next = { ...prev };
      for (const item of scopeItems) {
        delete next[item.id];
      }
      return next;
    });
    showToast('Status dan catatan pada tampilan ini telah direset.');
  }, [scopeItems, showToast]);

  const handleResetAllData = useCallback(() => {
    setMeta(createDefaultMeta());
    setResponses({});
    setCustomItems([]);
    setItemOverrides({});
    setFilter({
      equipmentCategory: 'Chilled Water Pump',
      frequency: 'Monthly',
      searchQuery: '',
      statusFilter: 'ALL',
    });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    showToast('Seluruh data inspeksi telah dibersihkan untuk mulai baru.');
  }, [showToast]);

  const handleDownloadExcel = useCallback(async () => {
    if (scopeItems.length === 0) return;
    try {
      const filename = await exportToExcel(
        scopeItems,
        meta,
        filter.equipmentCategory,
        filter.frequency
      );
      showToast(`File Excel siap cetak berhasil diunduh: ${filename}`);
    } catch {
      showToast('Gagal membuat file Excel. Silakan coba lagi.', true);
    }
  }, [scopeItems, meta, filter.equipmentCategory, filter.frequency, showToast]);

  const handleDownloadWord = useCallback(() => {
    if (scopeItems.length === 0) return;
    const filename = exportToWord(
      scopeItems,
      meta,
      filter.equipmentCategory,
      filter.frequency
    );
    showToast(`File Word berhasil diunduh: ${filename}`);
  }, [scopeItems, meta, filter.equipmentCategory, filter.frequency, showToast]);

  const handleDownloadPdf = useCallback(() => {
    if (scopeItems.length === 0) return;
    try {
      const filename = exportToPdf(
        scopeItems,
        meta,
        filter.equipmentCategory,
        filter.frequency
      );
      showToast(`File PDF siap cetak berhasil diunduh: ${filename}`);
    } catch {
      showToast('Gagal membuat file PDF. Silakan gunakan Cetak Printer.', true);
    }
  }, [scopeItems, meta, filter.equipmentCategory, filter.frequency, showToast]);

  const handleNativePrint = useCallback(() => {
    try {
      window.print();
    } catch {
      handleDownloadPdf();
    }
  }, [handleDownloadPdf]);

  const handleDownloadStandaloneHtml = useCallback(() => {
    const filename = exportStandaloneHtml(allTemplateItems);
    showToast(`File 1 HTML Standalone berhasil diunduh: ${filename}`);
  }, [allTemplateItems, showToast]);

  // --- Bridge Checklist -> FieldDoc Foto ---
  const handleOpenFieldDocFromChecklist = useCallback(() => {
    setFieldDocReport((prev) => ({
      ...prev,
      title:
        prev.title.trim() ||
        `${filter.equipmentCategory === 'ALL' ? 'Preventive Maintenance' : filter.equipmentCategory}${
          meta.unitLocation ? ` - ${meta.unitLocation}` : ''
        }`,
      wmLoc: meta.unitLocation.trim() || prev.wmLoc,
      author: meta.technicianName.trim() || prev.author,
      date: meta.inspectionDate || prev.date,
    }));
    setActiveModule('fielddoc');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Dialihkan ke FieldDoc Foto dengan info unit dari Checklist.');
  }, [filter.equipmentCategory, meta, showToast]);

  // --- FieldDoc Handlers ---
  const handleSelectModule = useCallback((mod: ActiveAppModule) => {
    setActiveModule(mod);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleFetchGps = useCallback(async () => {
    setGpsLoading(true);
    try {
      const res = await fetchLiveGpsCoords();
      if (res.ok && res.coordText) {
        setFieldDocReport((prev) => ({ ...prev, wmGps: res.coordText }));
        showToast(res.message);
      } else {
        showToast(res.message, true);
      }
    } finally {
      setGpsLoading(false);
    }
  }, [showToast]);

  const handleAddFieldDocSlot = useCallback(() => {
    setFieldDocReport((prev) => ({
      ...prev,
      slots: [...prev.slots, createBlankSlot()],
    }));
    showToast('1 slot foto baru ditambahkan.');
  }, [showToast]);

  const handleRemoveFieldDocSlot = useCallback(
    (index: number) => {
      if (fieldDocReport.slots.length <= 1) {
        showToast('Minimal harus ada 1 slot foto.', true);
        return;
      }
      setConfirmState({
        message: `Hapus Slot Foto #${index + 1} beserta isinya?`,
        confirmLabel: 'Hapus Slot',
        onConfirm: () => {
          setFieldDocReport((prev) => ({
            ...prev,
            slots: prev.slots.filter((_, idx) => idx !== index),
          }));
          setConfirmState(null);
          showToast('Slot foto berhasil dihapus.');
        },
      });
    },
    [fieldDocReport.slots.length, showToast]
  );

  const handleClearFieldDocSlotImage = useCallback(
    (index: number) => {
      setConfirmState({
        message: `Hapus gambar pada Foto #${index + 1}?`,
        confirmLabel: 'Hapus Foto',
        onConfirm: () => {
          setFieldDocReport((prev) => ({
            ...prev,
            slots: prev.slots.map((slot, idx) =>
              idx === index ? { ...slot, img: '' } : slot
            ),
          }));
          setConfirmState(null);
          showToast('Foto berhasil dihapus.');
        },
      });
    },
    [showToast]
  );

  const resetFieldDocNow = useCallback(() => {
    setFieldDocReport(loadInitialFieldDocReport());
    showToast('Lembar kerja FieldDoc telah di-reset.');
  }, [showToast]);

  const handleResetFieldDocWorkspace = useCallback(() => {
    const hasContent =
      Boolean(fieldDocReport.title.trim()) ||
      fieldDocReport.slots.some((s) => Boolean(s.img || s.desc.trim()));
    if (!hasContent) {
      resetFieldDocNow();
      return;
    }
    setConfirmState({
      message: 'Mulai lembar kerja FieldDoc baru? Data yang belum disimpan akan dibersihkan.',
      confirmLabel: 'Buat Baru',
      onConfirm: () => {
        setConfirmState(null);
        resetFieldDocNow();
      },
    });
  }, [fieldDocReport, resetFieldDocNow]);

  const handleSaveFieldDocArchive = useCallback(async () => {
    if (busyFieldDocExport) return;
    if (!fieldDocReport.title.trim()) {
      showToast('Harap isi judul pekerjaan terlebih dahulu.', true);
      document.getElementById('fdoc-job-title')?.focus();
      return;
    }
    setBusyFieldDocExport(true);
    try {
      const saved = await FieldDocStorageEngine.saveReport(fieldDocReport);
      setFieldDocReport(saved);
      setArchiveReports(getSanitizedLocalReports());
      showToast('Laporan FieldDoc berhasil disimpan ke Arsip.');
    } catch {
      showToast('Gagal menyimpan laporan FieldDoc.', true);
    } finally {
      setBusyFieldDocExport(false);
    }
  }, [busyFieldDocExport, fieldDocReport, showToast]);

  const handleExportFieldDoc = useCallback(
    async (kind: 'docx' | 'pdf' | 'xlsx') => {
      if (busyFieldDocExport) return;
      if (!fieldDocReport.title.trim()) {
        showToast('Harap isi judul pekerjaan terlebih dahulu.', true);
        document.getElementById('fdoc-job-title')?.focus();
        return;
      }
      setBusyFieldDocExport(true);
      try {
        const saved = await FieldDocStorageEngine.saveReport(fieldDocReport);
        setFieldDocReport(saved);
        setArchiveReports(getSanitizedLocalReports());
        const filename = await exportFieldDocFile(saved, kind);
        const label =
          kind === 'docx'
            ? 'Word (.docx)'
            : kind === 'xlsx'
              ? 'Excel (.xlsx)'
              : 'PDF';
        showToast(`Laporan ${label} berhasil diunduh: ${filename}`);
      } catch {
        showToast('Gagal membuat file export FieldDoc.', true);
      } finally {
        setBusyFieldDocExport(false);
      }
    },
    [busyFieldDocExport, fieldDocReport, showToast]
  );

  const handleEditArchivedReport = useCallback(
    (item: FieldDocReport) => {
      const cloned: FieldDocReport = JSON.parse(JSON.stringify(item));
      setFieldDocReport({
        ...cloned,
        org: cloned.org || DEFAULT_FIELDDOC_ORG,
        wmLoc: cloned.wmLoc || readLocalPref(FDOC_KEYS.wmLoc, 'Area Fasilitas Utama'),
        wmGps: cloned.wmGps || getInitialGpsString(),
        wmOn: cloned.wmOn === undefined ? true : cloned.wmOn,
      });
      setActiveModule('fielddoc');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('Laporan arsip berhasil dimuat ke editor.');
    },
    [showToast]
  );

  const handleDeleteArchivedReport = useCallback(
    (item: FieldDocReport) => {
      const label = item.title || 'Tanpa Judul';
      setConfirmState({
        message: `Hapus laporan "${label}" dari Arsip?`,
        confirmLabel: 'Hapus Laporan',
        onConfirm: () => {
          setConfirmState(null);
          if (!item.id) return;
          void FieldDocStorageEngine.deleteReport(item.id).then(() => {
            setArchiveReports((prev) =>
              prev.filter((r) => String(r.id) !== String(item.id))
            );
            setFieldDocReport((prev) =>
              String(prev.id) === String(item.id) ? { ...prev, id: null } : prev
            );
            showToast('Laporan berhasil dihapus dari Arsip.');
          });
        },
      });
    },
    [showToast]
  );

  const handleSaveProfile = useCallback(
    (name: string, email: string) => {
      try {
        window.localStorage.setItem(FDOC_KEYS.engineerName, name);
        window.localStorage.setItem(FDOC_KEYS.engineerEmail, email);
      } catch {
        // Ignore
      }
      setFieldDocReport((prev) => ({ ...prev, author: name, email }));
      setIsFieldDocProfileOpen(false);
      showToast('Profil Pelapor berhasil disimpan.');
    },
    [showToast]
  );

  const handleConnectCloud = useCallback(
    async (cfg: NonNullable<ReturnType<typeof getPrivateCloudConfig>>) => {
      savePrivateCloudConfig(cfg);
      setIsFieldDocCloudOpen(false);
      const ok = await initPrivateFirebaseConnection(
        (cloudList) => setArchiveReports(cloudList),
        (status) => setCloudStatus(status)
      );
      if (ok) {
        setArchiveReports((prev) => FieldDocStorageEngine.getReports(prev));
        showToast('Terhubung ke Cloud Firebase Privat Tim.');
      } else {
        showToast('Gagal menghubungkan ke Firebase.', true);
      }
    },
    [showToast]
  );

  const handleDisconnectCloud = useCallback(async () => {
    clearPrivateCloudConfig();
    stopPrivateFirebaseConnection();
    setCloudStatus({ mode: 'local', label: 'Penyimpanan Lokal' });
    setIsFieldDocCloudOpen(false);
    showToast('Koneksi Cloud diputus (kembali ke mode lokal).');
  }, [showToast]);

  const currentViewLabel = `${
    filter.equipmentCategory === 'ALL' ? 'Semua Peralatan' : filter.equipmentCategory
  } — ${filter.frequency === 'ALL' ? 'Semua Frekuensi' : filter.frequency}`;

  return (
    <div id="top" className="min-h-screen bg-[#F4F6F8] text-slate-900">
      <HeaderBar
        activeModule={activeModule}
        archiveCount={archiveReports.length}
        onSelectModule={handleSelectModule}
        onPrintPdf={() => setIsPdfPreviewOpen(true)}
        onExportFieldDocPdf={() => void handleExportFieldDoc('pdf')}
        onCreateNewFieldDoc={() => {
          resetFieldDocNow();
          setActiveModule('fielddoc');
        }}
      />

      <main className="no-print max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 pb-16">
        <OfflineIndicator isOnline={isOnline} offlineReady={offlineReady} />

        {/* Mobile 3-Module Switcher (keeps sticky header compact & < 15% mobile viewport) */}
        <div
          role="tablist"
          aria-label="Pilih modul aplikasi"
          className="md:hidden grid grid-cols-3 gap-1.5 bg-white border border-slate-200 p-1 rounded-xl"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeModule === 'checklist'}
            onClick={() => handleSelectModule('checklist')}
            className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeModule === 'checklist'
                ? 'bg-[#0F2942] text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Checklist</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeModule === 'fielddoc'}
            onClick={() => handleSelectModule('fielddoc')}
            className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeModule === 'fielddoc'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>FieldDoc</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeModule === 'archive'}
            onClick={() => handleSelectModule('archive')}
            className={`min-h-[44px] px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeModule === 'archive'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Arsip ({archiveReports.length})</span>
          </button>
        </div>

        {activeModule === 'checklist' && (
          <>
            <InspectionMetaCard
              meta={meta}
              onChange={handleMetaChange}
              lastSavedLabel={lastSavedLabel}
            />

            <FilterToolbar
              equipmentCategories={equipmentCategories}
              equipmentCounts={equipmentCounts}
              allFrequencies={allFrequencies}
              availableFrequencies={availableFrequencies}
              filter={filter}
              visibleCount={visibleItems.length}
              onEquipmentChange={handleEquipmentChange}
              onFrequencyChange={handleFrequencyChange}
              onSearchChange={(q) => setFilter((prev) => ({ ...prev, searchQuery: q }))}
              onStatusFilterChange={(sf) =>
                setFilter((prev) => ({ ...prev, statusFilter: sf }))
              }
              onSetAllOk={handleSetAllOk}
              onOpenAddModal={handleOpenAddModal}
            />

            <ProgressBanner
              progress={progress}
              equipmentLabel={filter.equipmentCategory}
              frequencyLabel={filter.frequency}
              onJumpToIssues={() =>
                setFilter((prev) => ({ ...prev, statusFilter: 'ISSUES' }))
              }
            />

            {/* Checklist Cards Feed */}
            <section
              id="daftar-checklist"
              aria-label="Daftar item checklist"
              className="space-y-4"
            >
              {visibleItems.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                    <ClipboardList className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-1 max-w-lg mx-auto">
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Tidak ada tugas pada filter yang dipilih
                    </h2>
                    <p className="text-sm text-slate-600">
                      {filter.searchQuery || filter.statusFilter !== 'ALL'
                        ? 'Coba hapus kata kunci pencarian atau pilih tab "Semua" untuk melihat seluruh tugas.'
                        : availableFrequencies.length === 0
                          ? `Belum ada tugas checklist untuk "${filter.equipmentCategory}" (${filter.frequency === 'ALL' ? 'Semua Frekuensi' : filter.frequency}). Klik tombol di bawah untuk mulai menambahkan tugas secara manual.`
                          : `Peralatan "${filter.equipmentCategory}" belum memiliki tugas pada frekuensi "${filter.frequency}". Pilih jadwal yang tersedia atau tambahkan item manual:`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    {(filter.searchQuery || filter.statusFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() =>
                          setFilter((prev) => ({
                            ...prev,
                            searchQuery: '',
                            statusFilter: 'ALL',
                          }))
                        }
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm cursor-pointer"
                      >
                        Tampilkan Semua Tugas
                      </button>
                    )}

                    {!filter.searchQuery &&
                      filter.statusFilter === 'ALL' &&
                      availableFrequencies.map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => handleFrequencyChange(freq)}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold text-sm cursor-pointer"
                        >
                          Buka Jadwal {freq}
                        </button>
                      ))}

                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                        availableFrequencies.length === 0
                          ? 'bg-blue-700 hover:bg-blue-800 text-white'
                          : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {availableFrequencies.length === 0
                          ? `Tambah Tugas untuk "${filter.equipmentCategory}"`
                          : 'Tambah Item Manual'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                visibleItems.map((item, idx) => (
                  <ChecklistCard
                    key={item.id}
                    item={item}
                    index={idx}
                    showEquipmentName={filter.equipmentCategory === 'ALL'}
                    onSelectStatus={handleSelectStatus}
                    onChangeRemarks={handleChangeRemarks}
                    onEditItem={handleOpenEditModal}
                    onDeleteCustom={item.isCustom ? handleDeleteCustomItem : undefined}
                  />
                ))
              )}
            </section>

            <ExportFooterBar
              visibleCount={scopeItems.length}
              onDownloadExcel={handleDownloadExcel}
              onDownloadWord={handleDownloadWord}
              onDownloadPdf={handleDownloadPdf}
              onOpenPdfPreview={() => setIsPdfPreviewOpen(true)}
              onOpenFieldDocFromChecklist={handleOpenFieldDocFromChecklist}
              onDownloadStandaloneHtml={handleDownloadStandaloneHtml}
              onOpenResetModal={() => setIsResetModalOpen(true)}
            />
          </>
        )}

        {activeModule === 'fielddoc' && (
          <FieldDocWorkspace
            report={fieldDocReport}
            isEditingArchive={Boolean(fieldDocReport.id)}
            isOnline={isOnline}
            cloudStatus={cloudStatus}
            busyExport={busyFieldDocExport}
            onUpdateReport={setFieldDocReport}
            onOpenProfileModal={() => setIsFieldDocProfileOpen(true)}
            onOpenCloudModal={() => setIsFieldDocCloudOpen(true)}
            onFetchGps={handleFetchGps}
            gpsLoading={gpsLoading}
            onAddSlot={handleAddFieldDocSlot}
            onRemoveSlot={handleRemoveFieldDocSlot}
            onClearSlotImage={handleClearFieldDocSlotImage}
            onResetWorkspace={handleResetFieldDocWorkspace}
            onSaveArchive={handleSaveFieldDocArchive}
            onExportDocx={() => handleExportFieldDoc('docx')}
            onExportExcel={() => handleExportFieldDoc('xlsx')}
            onExportPdf={() => handleExportFieldDoc('pdf')}
            onToast={showToast}
          />
        )}

        {activeModule === 'archive' && (
          <FieldDocArchiveView
            reports={archiveReports}
            cloudStatus={cloudStatus}
            onRefresh={() => {
              setArchiveReports(getSanitizedLocalReports());
              showToast('Daftar arsip diperbarui.');
            }}
            onEditReport={handleEditArchivedReport}
            onDeleteReport={handleDeleteArchivedReport}
            onOpenCloudModal={() => setIsFieldDocCloudOpen(true)}
            onCreateNew={() => {
              resetFieldDocNow();
              setActiveModule('fielddoc');
            }}
          />
        )}
      </main>

      {/* Dedicated Print / PDF Layout for Checklist */}
      <PrintReport
        items={scopeItems}
        meta={meta}
        equipmentLabel={filter.equipmentCategory}
        frequencyLabel={filter.frequency}
        progress={progress}
      />

      {/* Checklist Modals */}
      <PdfPreviewModal
        isOpen={isPdfPreviewOpen}
        items={scopeItems}
        meta={meta}
        equipmentLabel={filter.equipmentCategory}
        frequencyLabel={filter.frequency}
        progress={progress}
        onClose={() => setIsPdfPreviewOpen(false)}
        onDownloadPdf={handleDownloadPdf}
        onNativePrint={handleNativePrint}
      />

      <AddItemModal
        isOpen={isAddModalOpen}
        editingItem={editingItem}
        equipmentCategories={equipmentCategories}
        allFrequencies={allFrequencies}
        taskCategories={taskCategories}
        defaultEquipment={filter.equipmentCategory}
        defaultFrequency={filter.frequency}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
      />

      <ResetConfirmModal
        isOpen={isResetModalOpen}
        currentViewLabel={currentViewLabel}
        onClose={() => setIsResetModalOpen(false)}
        onResetCurrentView={handleResetCurrentView}
        onResetAllData={handleResetAllData}
      />

      {/* FieldDoc Modals */}
      <FieldDocProfileModal
        isOpen={isFieldDocProfileOpen}
        initialName={fieldDocReport.author}
        initialEmail={fieldDocReport.email}
        onClose={() => setIsFieldDocProfileOpen(false)}
        onSave={handleSaveProfile}
      />

      <FieldDocCloudModal
        isOpen={isFieldDocCloudOpen}
        initialConfig={getPrivateCloudConfig()}
        onClose={() => setIsFieldDocCloudOpen(false)}
        onConnect={handleConnectCloud}
        onDisconnect={handleDisconnectCloud}
        onToast={showToast}
      />

      <FieldDocConfirmModal
        isOpen={Boolean(confirmState)}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => confirmState?.onConfirm()}
      />

      {/* Subtle Non-Intrusive Toast Notification */}
      {toastState && (
        <div
          role="status"
          aria-live="polite"
          className={`no-print fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] sm:max-w-lg text-white px-5 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-sm font-semibold ${
            toastState.isError
              ? 'bg-red-700 border-red-600'
              : 'bg-slate-900 border-slate-700'
          }`}
        >
          {toastState.isError ? (
            <AlertCircle className="w-4 h-4 text-red-200 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          )}
          <span>{toastState.message}</span>
        </div>
      )}
    </div>
  );
}

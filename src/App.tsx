import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Plus } from 'lucide-react';
import { checklistData } from './data/checklistData';
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
import { HeaderBar } from './components/HeaderBar';
import { InspectionMetaCard } from './components/InspectionMetaCard';
import { FilterToolbar } from './components/FilterToolbar';
import { ProgressBanner } from './components/ProgressBanner';
import { ChecklistCard } from './components/ChecklistCard';
import { ExportFooterBar } from './components/ExportFooterBar';
import { AddItemModal } from './components/AddItemModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { PrintReport } from './components/PrintReport';
import { PdfPreviewModal } from './components/PdfPreviewModal';

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

export default function App() {
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Auto-save to localStorage whenever state changes
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

  // Items matching primary Equipment + Frequency scope (for Progress & Export)
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

  // Items currently visible after search + status tab
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
        showToast(`Perubahan item disimpan ke ${cleaned.equipmentCategory} (${cleaned.frequency}).`);
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
      showToast(`Item baru ditambahkan ke ${created.equipmentCategory} (${created.frequency}).`);
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
      showToast('Gagal membuat file Excel. Silakan coba lagi.');
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
      showToast('Gagal membuat file PDF. Silakan gunakan Cetak Printer.');
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

  const currentViewLabel = `${
    filter.equipmentCategory === 'ALL' ? 'Semua Peralatan' : filter.equipmentCategory
  } — ${filter.frequency === 'ALL' ? 'Semua Frekuensi' : filter.frequency}`;

  return (
    <div id="top" className="min-h-screen bg-[#F4F6F8] text-slate-900">
      <HeaderBar onPrintPdf={() => setIsPdfPreviewOpen(true)} />

      <main className="no-print max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 pb-16">
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
          onStatusFilterChange={(sf) => setFilter((prev) => ({ ...prev, statusFilter: sf }))}
          onSetAllOk={handleSetAllOk}
          onOpenAddModal={handleOpenAddModal}
        />

        <ProgressBanner
          progress={progress}
          equipmentLabel={filter.equipmentCategory}
          frequencyLabel={filter.frequency}
          onJumpToIssues={() => setFilter((prev) => ({ ...prev, statusFilter: 'ISSUES' }))}
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
          onDownloadStandaloneHtml={handleDownloadStandaloneHtml}
          onOpenResetModal={() => setIsResetModalOpen(true)}
        />
      </main>

      {/* Dedicated Print / PDF Layout */}
      <PrintReport
        items={scopeItems}
        meta={meta}
        equipmentLabel={filter.equipmentCategory}
        frequencyLabel={filter.frequency}
        progress={progress}
      />

      {/* Modals */}
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

      {/* Subtle Non-Intrusive Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] sm:max-w-lg bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-sm font-semibold"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

'use client';

import { useTRPC } from '@/trpc/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';

type FormData = {
  codigo: string;
  nombre: string;
  creditos: number;
  horasTeoria: number;
  horasLaboratorio: number;
  ciclo: number;
  requiereLaboratorio: boolean;
};

const emptyForm: FormData = {
  codigo: '', nombre: '', creditos: 3, horasTeoria: 2,
  horasLaboratorio: 0, ciclo: 1, requiereLaboratorio: false,
};

export default function CursosPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterCiclo, setFilterCiclo] = useState<number | undefined>();

  const { data: cursos = [], isLoading } = useQuery(
    trpc.curso.list.queryOptions({ search: search || undefined, ciclo: filterCiclo })
  );
  const { data: ciclos = [] } = useQuery(trpc.curso.ciclos.queryOptions());

  const createMutation = useMutation(
    trpc.curso.create.mutationOptions({
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: trpc.curso.list.queryKey() }); closeModal(); },
    })
  );
  const updateMutation = useMutation(
    trpc.curso.update.mutationOptions({
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: trpc.curso.list.queryKey() }); closeModal(); },
    })
  );
  const deleteMutation = useMutation(
    trpc.curso.delete.mutationOptions({
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: trpc.curso.list.queryKey() }); },
    })
  );

  function closeModal() { setShowModal(false); setEditId(null); setForm(emptyForm); }

  function openEdit(c: (typeof cursos)[0]) {
    setEditId(c.id);
    setForm({
      codigo: c.codigo, nombre: c.nombre, creditos: c.creditos,
      horasTeoria: c.horasTeoria, horasLaboratorio: c.horasLaboratorio,
      ciclo: c.ciclo, requiereLaboratorio: c.requiereLaboratorio,
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cursos</h1>
          <p className="text-sm text-gray-500 mt-1">{cursos.length} cursos registrados</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25">
          <Plus className="h-4 w-4" /> Nuevo Curso
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input type="text" placeholder="Buscar por nombre o código..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
        <select value={filterCiclo ?? ''} onChange={(e) => setFilterCiclo(e.target.value ? Number(e.target.value) : undefined)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none">
          <option value="">Todos los ciclos</option>
          {ciclos.map((c) => <option key={c} value={c}>Ciclo {c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th className="px-4 py-3 text-left font-medium text-gray-400">Código</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Nombre</th>
              <th className="px-4 py-3 text-center font-medium text-gray-400">Ciclo</th>
              <th className="px-4 py-3 text-center font-medium text-gray-400">Créditos</th>
              <th className="px-4 py-3 text-center font-medium text-gray-400">H. Teoría</th>
              <th className="px-4 py-3 text-center font-medium text-gray-400">H. Lab</th>
              <th className="px-4 py-3 text-center font-medium text-gray-400">Grupos</th>
              <th className="px-4 py-3 text-right font-medium text-gray-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600">Cargando...</td></tr>
            ) : cursos.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600">No se encontraron cursos</td></tr>
            ) : (
              cursos.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-400">{c.codigo}</td>
                  <td className="px-4 py-3 font-medium text-gray-200">{c.nombre}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">{c.ciclo}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">{c.creditos}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{c.horasTeoria}h</td>
                  <td className="px-4 py-3 text-center text-gray-400">{c.horasLaboratorio}h</td>
                  <td className="px-4 py-3 text-center text-gray-400">{c.grupos.length}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-700 hover:text-gray-300"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteMutation.mutate({ id: c.id })} className="rounded-md p-1.5 text-gray-500 hover:bg-red-900/30 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">{editId ? 'Editar Curso' : 'Nuevo Curso'}</h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-gray-500 hover:bg-gray-800"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Código</label>
                  <input type="text" required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Ciclo</label>
                  <input type="number" required min={1} max={12} value={form.ciclo} onChange={(e) => setForm({ ...form, ciclo: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nombre</label>
                <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Créditos</label>
                  <input type="number" required min={1} max={10} value={form.creditos} onChange={(e) => setForm({ ...form, creditos: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">H. Teoría</label>
                  <input type="number" required min={0} value={form.horasTeoria} onChange={(e) => setForm({ ...form, horasTeoria: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">H. Lab</label>
                  <input type="number" required min={0} value={form.horasLaboratorio} onChange={(e) => setForm({ ...form, horasLaboratorio: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.requiereLaboratorio} onChange={(e) => setForm({ ...form, requiereLaboratorio: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-800 text-indigo-500" />
                Requiere laboratorio
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800">Cancelar</button>
                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}>
                  {editId ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

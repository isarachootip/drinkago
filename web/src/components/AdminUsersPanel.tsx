import React, { useCallback, useEffect, useState } from 'react';
import { adminMgmtApi, ManagedUser } from '../api/admin-api';
import { AdminUsersView } from './AdminUsersView';
import { IconCheck, IconEdit, IconPlus } from './icons/ActionIcons';
import { IconUser } from './icons/Icons';
import { AdminViewMode, getSavedViewMode, ViewModeToggle } from './ViewModeToggle';

interface Props {
  onNotify: (msg: string) => void;
  viewMode?: AdminViewMode;
  onViewModeChange?: (mode: AdminViewMode) => void;
}

type UserRole = 'admin' | 'warehouse' | 'rider' | 'customer';
type RoleFilter = 'all' | UserRole;

export const AdminUsersPanel: React.FC<Props> = ({ onNotify, viewMode: propMode, onViewModeChange }) => {
  const [localMode, setLocalMode] = useState<AdminViewMode>(() => getSavedViewMode());
  const viewMode = propMode ?? localMode;
  const handleModeChange = (m: AdminViewMode) => { setLocalMode(m); onViewModeChange?.(m); };

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filterRole, setFilterRole] = useState<RoleFilter>('all');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [role, setRole] = useState<UserRole>('warehouse');
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ username: '', password: '', name: '', phone: '', lineUserId: '', role: 'warehouse' as UserRole, active: true });
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    try { setUsers(await adminMgmtApi.listUsers()); }
    catch (e) { onNotify(e instanceof Error ? e.message : 'ดึงรายชื่อผู้ใช้งานไม่สำเร็จ'); }
  }, [onNotify]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return onNotify('กรุณากรอกชื่อ-นามสกุลผู้ใช้งาน');
    setBusy(true);
    try {
      await adminMgmtApi.createUser({
        username: username.trim() || undefined,
        password: password || undefined,
        lineUserId: lineUserId.trim() || undefined,
        role,
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      setUsername(''); setPassword(''); setName(''); setPhone(''); setLineUserId('');
      onNotify('สร้างผู้ใช้งานใหม่เรียบร้อย');
      await loadUsers();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'สร้างผู้ใช้งานไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const handleOpenEdit = (u: ManagedUser) => {
    if (editId === u.id) return setEditId(null);
    setEditId(u.id);
    setEditForm({
      username: u.username ?? '',
      password: '',
      name: u.name,
      phone: u.phone ?? '',
      lineUserId: u.lineUserId,
      role: u.role,
      active: u.active,
    });
  };

  const handleSaveEdit = async (u: ManagedUser) => {
    setBusy(true);
    try {
      await adminMgmtApi.updateUser(u.id, {
        username: editForm.username.trim() || null,
        password: editForm.password || undefined,
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        lineUserId: editForm.lineUserId.trim(),
        role: editForm.role,
        active: editForm.active,
      });
      setEditId(null);
      onNotify(`อัปเดตผู้ใช้งาน ${editForm.name} เรียบร้อย`);
      await loadUsers();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'แก้ไขไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const handleDelete = async (u: ManagedUser) => {
    setBusy(true);
    try {
      const res = await adminMgmtApi.deleteUser(u.id);
      onNotify(
        res.mode === 'HARD_DELETE'
          ? `ลบผู้ใช้ ${u.name} ออกจากฐานข้อมูลแล้ว`
          : `ระงับบัญชี ${u.name} แล้วเนื่องจากมีประวัติธุรกรรมในระบบ`,
      );
      await loadUsers();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'ลบผู้ใช้งานไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const filtered = filterRole === 'all' ? users : users.filter((u) => u.role === filterRole);
  const editingUser = users.find((u) => u.id === editId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <form onSubmit={handleCreate} className="dg-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
          <IconUser size={15} style={{ color: '#1D4ED8' }} />
          <span>เพิ่มผู้ใช้งานใหม่ (User Management)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ-นามสกุล *" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontWeight: 600, fontSize: 13 }}>
            <option value="admin">Admin (ผู้ดูแล)</option>
            <option value="warehouse">Warehouse (คลัง)</option>
            <option value="rider">Rider (ไรเดอร์)</option>
            <option value="customer">Customer (สมาชิก)</option>
          </select>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (>= 4 ตัว)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทรศัพท์" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={lineUserId} onChange={(e) => setLineUserId(e.target.value)} placeholder="LINE ID (เว้นว่างได้)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
        </div>
        <button type="submit" disabled={busy} className="dg-btn-icon" style={{ minHeight: 40, borderRadius: 9, border: 'none', background: '#0F172A', color: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <IconPlus size={14} />
          <span>สร้างผู้ใช้งานใหม่</span>
        </button>
      </form>

      <ViewModeToggle
        mode={viewMode}
        onChange={handleModeChange}
        title="รายชื่อผู้ใช้งานทั้งหมด"
        count={filtered.length}
        extra={
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['all', 'admin', 'warehouse', 'rider', 'customer'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFilterRole(r)}
                style={{ padding: '4px 10px', borderRadius: 8, border: filterRole === r ? '1px solid #0F172A' : '1px solid #E2E8F0', background: filterRole === r ? '#0F172A' : '#FFFFFF', color: filterRole === r ? '#FFFFFF' : '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />

      {editingUser && (
        <div className="dg-card" style={{ border: '1.5px solid #1D4ED8', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              <IconEdit size={14} style={{ color: '#1D4ED8' }} />
              <span>แก้ไขข้อมูลผู้ใช้งาน: {editingUser.name}</span>
            </span>
            <button type="button" onClick={() => setEditId(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>ปิด</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 8 }}>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="ชื่อ-นามสกุล" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as typeof editForm.role })} style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }}>
              <option value="admin">admin</option><option value="warehouse">warehouse</option><option value="rider">rider</option><option value="customer">customer</option>
            </select>
            <input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} placeholder="Username" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="รหัสผ่านใหม่ (เว้นว่างได้)" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="เบอร์โทร" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <button type="button" onClick={() => setEditForm({ ...editForm, active: !editForm.active })} style={{ minHeight: 36, borderRadius: 8, border: '1px solid #CBD5E1', background: editForm.active ? '#ECFDF5' : '#FEF2F2', color: editForm.active ? '#047857' : '#B91C1C', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              {editForm.active ? 'Active' : 'ระงับบัญชี'}
            </button>
            <button type="button" onClick={() => handleSaveEdit(editingUser)} disabled={busy} className="dg-btn-icon" style={{ minHeight: 36, borderRadius: 8, border: 'none', background: '#059669', color: '#FFFFFF', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              <IconCheck size={14} />
              <span>บันทึก</span>
            </button>
          </div>
        </div>
      )}

      <AdminUsersView users={filtered} viewMode={viewMode} editId={editId} busy={busy} onOpenEdit={handleOpenEdit} onDelete={handleDelete} />
    </div>
  );
};

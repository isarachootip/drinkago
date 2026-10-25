import React, { useCallback, useEffect, useState } from 'react';
import { adminMgmtApi, ManagedUser } from '../api/admin-api';

interface Props {
  onNotify: (msg: string) => void;
}

type RoleFilter = 'all' | 'admin' | 'warehouse' | 'rider' | 'customer';

export const AdminUsersPanel: React.FC<Props> = ({ onNotify }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filterRole, setFilterRole] = useState<RoleFilter>('all');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [role, setRole] = useState<'admin' | 'warehouse' | 'rider' | 'customer'>('warehouse');
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    username: string;
    password: string;
    name: string;
    phone: string;
    lineUserId: string;
    role: 'admin' | 'warehouse' | 'rider' | 'customer';
    active: boolean;
  }>({ username: '', password: '', name: '', phone: '', lineUserId: '', role: 'warehouse', active: true });
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
      onNotify('สร้างผู้ใช้งานใหม่เรียบร้อย (Create)');
      await loadUsers();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'สร้างผู้ใช้งานไม่สำเร็จ'); }
    finally { setBusy(false); }
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
      onNotify(`อัปเดตผู้ใช้งาน ${editForm.name} เรียบร้อย (Update)`);
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
          ? `ลบผู้ใช้ ${u.name} ออกจากฐานข้อมูลแล้ว (Hard Delete)`
          : `ระงับบัญชี ${u.name} แล้วเนื่องจากมีประวัติธุรกรรมในระบบ (Soft Delete)`,
      );
      await loadUsers();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'ลบผู้ใช้งานไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const filtered = filterRole === 'all' ? users : users.filter((u) => u.role === filterRole);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <form
        onSubmit={handleCreate}
        style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>👤 เพิ่มผู้ใช้งานใหม่ (User Management — Create)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ-นามสกุล *" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD', fontWeight: 600 }}>
            <option value="admin">บทบาท: Admin (ผู้ดูแล)</option>
            <option value="warehouse">บทบาท: Warehouse (คลัง)</option>
            <option value="rider">บทบาท: Rider (ไรเดอร์)</option>
            <option value="customer">บทบาท: Customer (สมาชิก)</option>
          </select>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username (สำหรับล็อกอิน)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (อย่างน้อย 4 ตัว)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทรศัพท์" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={lineUserId} onChange={(e) => setLineUserId(e.target.value)} placeholder="LINE ID (เว้นว่างให้สร้างอัตโนมัติ)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
        </div>
        <button type="submit" disabled={busy} style={{ minHeight: 40, borderRadius: 10, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
          + สร้างผู้ใช้งานใหม่
        </button>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>รายชื่อผู้ใช้งานทั้งหมด ({filtered.length} คน)</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'admin', 'warehouse', 'rider', 'customer'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilterRole(r)}
              style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #DCE4EC', background: filterRole === r ? '#0F2236' : '#FFFFFF', color: filterRole === r ? '#FFFFFF' : '#33475B', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((u) => (
          <div key={u.id} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, opacity: u.active ? 1 : 0.65 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{u.name}</span>{' '}
                <span style={{ padding: '2px 8px', borderRadius: 6, background: '#E6EEF9', color: '#123F85', fontSize: 11, fontWeight: 700 }}>{u.role.toUpperCase()}</span>{' '}
                <span style={{ fontSize: 12, color: '#4A5B6E' }}>
                  · Username: <b>{u.username || '-'}</b> ({u.hasPassword ? '🔑 มีรหัสผ่าน' : 'เฉพาะ LINE'}) · LINE: {u.lineUserId}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditId(editId === u.id ? null : u.id);
                    setEditForm({
                      username: u.username ?? '',
                      password: '',
                      name: u.name,
                      phone: u.phone ?? '',
                      lineUserId: u.lineUserId,
                      role: u.role,
                      active: u.active,
                    });
                  }}
                  style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #DCE4EC', background: '#F3F7FA', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  ✏️ แก้ไข / ตั้งรหัสผ่าน
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(u)}
                  disabled={busy}
                  style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #C2255C', background: '#FFF5F8', color: '#C2255C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  🗑️ ลบ
                </button>
              </div>
            </div>

            {editId === u.id && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 8, paddingTop: 8, borderTop: '1px solid #EEF2F6' }}>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="ชื่อ-นามสกุล" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as typeof editForm.role })} style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }}>
                  <option value="admin">admin</option>
                  <option value="warehouse">warehouse</option>
                  <option value="rider">rider</option>
                  <option value="customer">customer</option>
                </select>
                <input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} placeholder="Username" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
                <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
                <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="เบอร์โทร" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
                <button type="button" onClick={() => setEditForm({ ...editForm, active: !editForm.active })} style={{ minHeight: 36, borderRadius: 8, border: '1px solid #9AABBD', background: editForm.active ? '#E7F5EC' : '#FCE8EF', fontWeight: 700, cursor: 'pointer' }}>
                  {editForm.active ? '● Active' : '○ ระงับบัญชี'}
                </button>
                <button type="button" onClick={() => handleSaveEdit(u)} disabled={busy} style={{ minHeight: 36, borderRadius: 8, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
                  บันทึกการแก้ไข
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

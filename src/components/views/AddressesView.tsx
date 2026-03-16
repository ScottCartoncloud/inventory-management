import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAddresses, useUpdateAddress, useDeactivateAddress, type Address } from "@/hooks/useAddresses";
import { Search, MapPin, Pencil, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

const SOURCE_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  cartoncloud: { label: "CartonCloud", variant: "default" },
  google_places: { label: "Google", variant: "secondary" },
  manual: { label: "Manual", variant: "outline" },
};

export function AddressesView() {
  const { data: addresses = [], isLoading } = useAddresses();
  const updateAddress = useUpdateAddress();
  const deactivateAddress = useDeactivateAddress();

  const [search, setSearch] = useState("");
  const [editAddr, setEditAddr] = useState<Address | null>(null);
  const [editForm, setEditForm] = useState({ company_name: "", address1: "", suburb: "", state_code: "", postcode: "" });

  const filtered = addresses.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [a.company_name, a.address1, a.suburb, a.postcode, a.state_code]
      .some(f => f?.toLowerCase().includes(q));
  });

  function openEdit(addr: Address) {
    setEditAddr(addr);
    setEditForm({
      company_name: addr.company_name || "",
      address1: addr.address1,
      suburb: addr.suburb || "",
      state_code: addr.state_code || "",
      postcode: addr.postcode || "",
    });
  }

  function handleSaveEdit() {
    if (!editAddr) return;
    updateAddress.mutate({
      id: editAddr.id,
      company_name: editForm.company_name || null,
      address1: editForm.address1,
      suburb: editForm.suburb || null,
      state_code: editForm.state_code || null,
      postcode: editForm.postcode || null,
    });
    setEditAddr(null);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-card border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin size={20} className="text-muted-foreground" />
          <h1 className="text-lg font-semibold">Address Book</h1>
          <span className="text-sm text-muted-foreground">{addresses.length} addresses</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder="Search addresses…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <span className="text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading addresses…</span>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Company</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Suburb</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Postcode</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {search ? "No addresses match your search" : "No addresses yet — they'll appear as orders come in"}
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(addr => {
                    const src = SOURCE_BADGES[addr.source] || SOURCE_BADGES.manual;
                    return (
                      <TableRow key={addr.id}>
                        <TableCell className="font-medium">{addr.company_name || "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{addr.address1}</TableCell>
                        <TableCell>{addr.suburb || "—"}</TableCell>
                        <TableCell>{addr.state_code || "—"}</TableCell>
                        <TableCell>{addr.postcode || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={src.variant} className="text-xs">{src.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{addr.use_count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {addr.last_used_at ? format(new Date(addr.last_used_at), "dd MMM yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(addr)} className="p-1 text-muted-foreground hover:text-foreground">
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => { if (confirm("Deactivate this address?")) deactivateAddress.mutate(addr.id); }}
                              className="p-1 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editAddr} onOpenChange={open => { if (!open) setEditAddr(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Company name" value={editForm.company_name} onChange={e => setEditForm(p => ({ ...p, company_name: e.target.value }))} />
            <Input placeholder="Address line 1" value={editForm.address1} onChange={e => setEditForm(p => ({ ...p, address1: e.target.value }))} />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Suburb" value={editForm.suburb} onChange={e => setEditForm(p => ({ ...p, suburb: e.target.value }))} />
              <Input placeholder="State" value={editForm.state_code} onChange={e => setEditForm(p => ({ ...p, state_code: e.target.value }))} />
              <Input placeholder="Postcode" value={editForm.postcode} onChange={e => setEditForm(p => ({ ...p, postcode: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAddr(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.address1}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

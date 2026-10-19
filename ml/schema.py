"""
Schema definitions for Blueprint Digital SO - Work Ticket extraction.
"""
from dataclasses import dataclass, field, asdict
from typing import List, Optional

@dataclass
class TicketItem:
    description: str
    quantity: int
    size: Optional[str] = None
    material: Optional[str] = None
    process: Optional[str] = None
    wt_number: Optional[str] = None
    step: Optional[str] = None  # 'machining', 'fabricating', 'finishing', 'dispatch'

@dataclass
class WorkTicket:
    ce_number: str
    sales_order_no: str
    customer: str
    reference: str  # Project name
    order_no: Optional[str] = None  # Customer PO
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    dispatch_method: Optional[str] = None
    created_by: Optional[str] = None
    sales_rep: Optional[str] = None
    created_date: Optional[str] = None
    customer_req_date: Optional[str] = None
    production_due_date: Optional[str] = None
    notes: Optional[str] = None
    items: List[TicketItem] = field(default_factory=list)

    def to_dict(self):
        return asdict(self)

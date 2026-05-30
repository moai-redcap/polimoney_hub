"""Polimoney APIのスキーマ定義

公開済み選挙一覧など、Polimoney向けエンドポイントのレスポンス形式。
"""

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ElectionListItem(BaseModel):
    """公開済み選挙一覧の1件

    Attributes:
        id: 選挙ID
        name: 選挙名
        type: 選挙タイプコード
        election_date: 選挙日
        district_id: 選挙区ID
        district_name: 選挙区名
    """

    id: UUID
    name: str
    type: str
    election_date: date
    district_id: Optional[UUID] = None
    district_name: Optional[str] = None


class ElectionsListResponse(BaseModel):
    """公開済み選挙一覧レスポンス

    Attributes:
        api_version: APIバージョン
        data: 選挙一覧
        total_count: 件数
    """

    api_version: str = "v1"
    data: list[ElectionListItem]
    total_count: int

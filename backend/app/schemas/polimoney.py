"""Polimoney APIのスキーマ定義

公開済み選挙一覧など、Polimoney向けエンドポイントのレスポンス形式。
"""

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.schemas.election_funds import ElectionFundsSummary, PoliticianInfo


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


class CandidateListItem(BaseModel):
    """選挙候補者一覧の1件

    Attributes:
        ledger_id: 台帳ID
        politician: 政治家情報
        summary: サマリー情報
    """

    ledger_id: UUID
    politician: PoliticianInfo
    summary: ElectionFundsSummary


class ElectionCandidatesResponse(BaseModel):
    """選挙候補者一覧レスポンス

    Attributes:
        api_version: APIバージョン
        election_id: 選挙ID
        data: 候補者一覧
        total_count: 件数
    """

    api_version: str = "v1"
    election_id: UUID
    data: list[CandidateListItem]
    total_count: int


class CandidateRef(BaseModel):
    """複数候補者エラー時の候補者参照

    Attributes:
        politician_id: 政治家ID
        ledger_id: 台帳ID
    """

    politician_id: UUID
    ledger_id: UUID


class MultipleCandidatesError(BaseModel):
    """同一選挙に複数候補者が存在する場合のエラーレスポンス

    Attributes:
        error: エラーメッセージ
        candidates: 候補者一覧（politician_id / ledger_id）
    """

    error: str
    candidates: list[CandidateRef]

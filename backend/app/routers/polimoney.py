"""Polimoney APIエンドポイント

公開済み選挙データの一覧取得など、Polimoney向けAPIを提供する。
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app import schemas
from app.database.supabase import get_supabase_client_dep

router = APIRouter()


def _build_election_list_item(election_data: dict) -> schemas.ElectionListItem:
    """Supabaseの選挙データを一覧用レスポンスに変換する

    Args:
        election_data: elections テーブルの行（district ネスト含む）

    Returns:
        schemas.ElectionListItem: 選挙一覧の1件
    """
    district = election_data.get("district") or {}
    district_id = district.get("id")
    district_name = district.get("name")

    return schemas.ElectionListItem(
        id=UUID(election_data["id"]),
        name=election_data["name"],
        type=election_data["type"],
        election_date=election_data["election_date"],
        district_id=UUID(district_id) if district_id else None,
        district_name=district_name,
    )


@router.get(
    "/polimoney/elections",
    response_model=schemas.ElectionsListResponse,
)
async def get_polimoney_elections(
    supabase: Client = Depends(get_supabase_client_dep),
):
    """収支データが公開されている選挙の一覧を取得する

    public_ledgers に election_id が設定されている選挙のみ返却する。
    同一選挙に複数候補者の台帳がある場合は重複を除去する。

    Args:
        supabase: Supabaseクライアント

    Returns:
        schemas.ElectionsListResponse: 公開済み選挙一覧

    Raises:
        HTTPException: データ取得に失敗した場合
    """
    ledgers_response = (
        supabase.table("public_ledgers")
        .select(
            """
            election_id,
            elections:election_id(
                id,
                name,
                type,
                election_date,
                district:districts(id, name)
            )
            """
        )
        .not_.is_("election_id", "null")
        .execute()
    )

    if ledgers_response.data is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="選挙一覧の取得に失敗しました",
        )

    election_map: dict[str, dict] = {}
    for ledger in ledgers_response.data:
        election_data = ledger.get("elections")
        if election_data and election_data["id"] not in election_map:
            election_map[election_data["id"]] = election_data

    elections = [
        _build_election_list_item(election_data)
        for election_data in election_map.values()
    ]
    elections.sort(key=lambda e: e.election_date, reverse=True)

    return schemas.ElectionsListResponse(
        data=elections,
        total_count=len(elections),
    )

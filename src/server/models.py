from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, LargeBinary, Integer, ForeignKey, DateTime


class Base(DeclarativeBase):
pass


class User(Base):
__tablename__ = "users"
id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
username: Mapped[str] = mapped_column(String(150), unique=True, index=True)
display_name: Mapped[str] = mapped_column(String(150))
user_handle: Mapped[bytes] = mapped_column(LargeBinary) # stable random handle (16–32 bytes)
created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


credentials: Mapped[list[Credential]] = relationship("Credential", back_populates="user", cascade="all, delete-orphan")


class Credential(Base):
__tablename__ = "credentials"
id: Mapped[int] = mapped_column(primary_key=True)
user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))


# WebAuthn identifiers
credential_id: Mapped[bytes] = mapped_column(LargeBinary, unique=True, index=True)
public_key: Mapped[bytes] = mapped_column(LargeBinary) # COSE key bytes
sign_count: Mapped[int] = mapped_column(Integer, default=0)
aaguid: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)


# Optional metadata
transports: Mapped[str | None] = mapped_column(String(100), nullable=True)
created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


user: Mapped[User] = relationship("User", back_populates="credentials")
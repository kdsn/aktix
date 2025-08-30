import base64


def b64url_encode(data: bytes) -> str:
return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64url_decode(data: str) -> bytes:
pad = "=" * ((4 - len(data) % 4) % 4)
return base64.urlsafe_b64decode((data + pad).encode("ascii"))
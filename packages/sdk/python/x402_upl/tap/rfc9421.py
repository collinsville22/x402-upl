import base64
import secrets
from dataclasses import dataclass
from typing import Literal, Tuple

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives import serialization


SignatureAlgorithm = Literal["ed25519", "rsa-pss-sha256"]


@dataclass
class SignatureParams:
    created: int
    expires: int
    key_id: str
    alg: SignatureAlgorithm
    nonce: str
    tag: Literal["agent-browser-auth", "agent-payer-auth"]


@dataclass
class SignatureComponents:
    authority: str
    path: str


@dataclass
class SignatureResult:
    signature_input: str
    signature: str


class RFC9421Signature:
    @staticmethod
    def create_signature_base(
        components: SignatureComponents,
        params: SignatureParams
    ) -> str:
        lines = []

        lines.append(f'"@authority": {components.authority}')
        lines.append(f'"@path": {components.path}')

        signature_params_value = (
            f'("@authority" "@path"); '
            f'created={params.created}; '
            f'expires={params.expires}; '
            f'keyid="{params.key_id}"; '
            f'alg="{params.alg}"; '
            f'nonce="{params.nonce}"; '
            f'tag="{params.tag}"'
        )
        lines.append(f'"@signature-params": {signature_params_value}')

        return '\n'.join(lines)

    @staticmethod
    async def sign_ed25519(
        components: SignatureComponents,
        params: SignatureParams,
        private_key: Ed25519PrivateKey
    ) -> SignatureResult:
        signature_base = RFC9421Signature.create_signature_base(components, params)
        message = signature_base.encode('utf-8')

        signature = private_key.sign(message)
        signature_b64 = base64.b64encode(signature).decode('utf-8')

        signature_input = (
            f'sig2=("@authority" "@path"); '
            f'created={params.created}; '
            f'expires={params.expires}; '
            f'keyid="{params.key_id}"; '
            f'alg="{params.alg}"; '
            f'nonce="{params.nonce}"; '
            f'tag="{params.tag}"'
        )

        return SignatureResult(
            signature_input=signature_input,
            signature=f'sig2=:{signature_b64}:'
        )

    @staticmethod
    def generate_nonce() -> str:
        return secrets.token_hex(16)

    @staticmethod
    def generate_ed25519_keypair() -> Tuple[Ed25519PrivateKey, Ed25519PublicKey]:
        private_key = Ed25519PrivateKey.generate()
        public_key = private_key.public_key()
        return private_key, public_key

    @staticmethod
    def private_key_to_base64(private_key: Ed25519PrivateKey) -> str:
        private_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption()
        )
        return base64.b64encode(private_bytes).decode('utf-8')

    @staticmethod
    def private_key_from_base64(b64_str: str) -> Ed25519PrivateKey:
        private_bytes = base64.b64decode(b64_str)
        return Ed25519PrivateKey.from_private_bytes(private_bytes)

    @staticmethod
    def public_key_to_base64(public_key: Ed25519PublicKey) -> str:
        public_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        return base64.b64encode(public_bytes).decode('utf-8')

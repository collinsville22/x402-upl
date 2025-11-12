package tap

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

type SignatureAlgorithm string

const (
	Ed25519       SignatureAlgorithm = "ed25519"
	RsaPssSha256  SignatureAlgorithm = "rsa-pss-sha256"
)

type SignatureParams struct {
	Created int64
	Expires int64
	KeyID   string
	Alg     SignatureAlgorithm
	Nonce   string
	Tag     string
}

type SignatureComponents struct {
	Authority string
	Path      string
}

type SignatureResult struct {
	SignatureInput string
	Signature      string
}

func CreateSignatureBase(components *SignatureComponents, params *SignatureParams) string {
	var lines []string

	lines = append(lines, fmt.Sprintf(`"@authority": %s`, components.Authority))
	lines = append(lines, fmt.Sprintf(`"@path": %s`, components.Path))

	signatureParamsValue := fmt.Sprintf(
		`("@authority" "@path"); created=%d; expires=%d; keyid="%s"; alg="%s"; nonce="%s"; tag="%s"`,
		params.Created,
		params.Expires,
		params.KeyID,
		params.Alg,
		params.Nonce,
		params.Tag,
	)

	lines = append(lines, fmt.Sprintf(`"@signature-params": %s`, signatureParamsValue))

	return strings.Join(lines, "\n")
}

func SignEd25519(
	components *SignatureComponents,
	params *SignatureParams,
	privateKey ed25519.PrivateKey,
) (*SignatureResult, error) {
	signatureBase := CreateSignatureBase(components, params)
	message := []byte(signatureBase)

	signature := ed25519.Sign(privateKey, message)
	signatureB64 := base64.StdEncoding.EncodeToString(signature)

	signatureInput := fmt.Sprintf(
		`sig2=("@authority" "@path"); created=%d; expires=%d; keyid="%s"; alg="%s"; nonce="%s"; tag="%s"`,
		params.Created,
		params.Expires,
		params.KeyID,
		params.Alg,
		params.Nonce,
		params.Tag,
	)

	return &SignatureResult{
		SignatureInput: signatureInput,
		Signature:      fmt.Sprintf("sig2=:%s:", signatureB64),
	}, nil
}

func GenerateNonce() (string, error) {
	nonce := make([]byte, 16)
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	return hex.EncodeToString(nonce), nil
}

func GenerateEd25519Keypair() (ed25519.PublicKey, ed25519.PrivateKey, error) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, nil, err
	}
	return pub, priv, nil
}

func GetCurrentTimestamp() int64 {
	return time.Now().Unix()
}

func PrivateKeyToBase64(privateKey ed25519.PrivateKey) string {
	return base64.StdEncoding.EncodeToString(privateKey.Seed())
}

func PrivateKeyFromBase64(b64Str string) (ed25519.PrivateKey, error) {
	seed, err := base64.StdEncoding.DecodeString(b64Str)
	if err != nil {
		return nil, err
	}
	return ed25519.NewKeyFromSeed(seed), nil
}

func PublicKeyToBase64(publicKey ed25519.PublicKey) string {
	return base64.StdEncoding.EncodeToString(publicKey)
}

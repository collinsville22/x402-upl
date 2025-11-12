package x402

import "fmt"

type X402Error struct {
	Type    ErrorType
	Message string
	Err     error
}

type ErrorType int

const (
	ErrorTypePaymentRequired ErrorType = iota
	ErrorTypePaymentFailed
	ErrorTypeInsufficientBalance
	ErrorTypeNetwork
	ErrorTypeInvalidResponse
	ErrorTypeSolana
	ErrorTypeValidation
)

func (e *X402Error) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *X402Error) Unwrap() error {
	return e.Err
}

func NewPaymentRequiredError(msg string) *X402Error {
	return &X402Error{
		Type:    ErrorTypePaymentRequired,
		Message: msg,
	}
}

func NewPaymentFailedError(msg string, err error) *X402Error {
	return &X402Error{
		Type:    ErrorTypePaymentFailed,
		Message: msg,
		Err:     err,
	}
}

func NewInsufficientBalanceError(msg string) *X402Error {
	return &X402Error{
		Type:    ErrorTypeInsufficientBalance,
		Message: msg,
	}
}

func NewNetworkError(msg string, err error) *X402Error {
	return &X402Error{
		Type:    ErrorTypeNetwork,
		Message: msg,
		Err:     err,
	}
}

func NewInvalidResponseError(msg string, err error) *X402Error {
	return &X402Error{
		Type:    ErrorTypeInvalidResponse,
		Message: msg,
		Err:     err,
	}
}

func NewSolanaError(msg string, err error) *X402Error {
	return &X402Error{
		Type:    ErrorTypeSolana,
		Message: msg,
		Err:     err,
	}
}

func NewValidationError(msg string) *X402Error {
	return &X402Error{
		Type:    ErrorTypeValidation,
		Message: msg,
	}
}

class X402Error(Exception):
    pass


class PaymentRequiredError(X402Error):
    def __init__(self, requirements: dict):
        self.requirements = requirements
        super().__init__(f"Payment required: {requirements}")


class PaymentFailedError(X402Error):
    pass


class InsufficientBalanceError(X402Error):
    pass


class NetworkError(X402Error):
    pass


class ValidationError(X402Error):
    pass

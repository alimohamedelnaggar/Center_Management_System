using System;
using System.Collections.Generic;
using System.Text;

namespace CenterManagement.Core.Features.Payments.Commands.DeletePayment
{
    public record DeletePaymentCommand(Guid PaymentId)
     : IRequest<Response<bool>>;
}

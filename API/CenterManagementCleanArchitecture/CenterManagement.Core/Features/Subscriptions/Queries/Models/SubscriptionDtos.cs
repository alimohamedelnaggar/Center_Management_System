namespace CenterManagement.Core.Features.Subscriptions.Queries.Models;

/// <summary>A single toggleable module and its relationships, for the UI checkboxes.</summary>
public class CenterModuleStateDto
{
    public string Key { get; set; } = default!;
    public string Name { get; set; } = default!;
    public bool Enabled { get; set; }

    /// <summary>Modules this one requires (auto-enabled when this module is on).</summary>
    public List<string> Requires { get; set; } = [];

    /// <summary>Modules that require this one (blocks turning it off while they are on).</summary>
    public List<string> RequiredBy { get; set; } = [];
}

/// <summary>A named module preset offered in the screen ("حضور فقط", "متوسط", "كامل").</summary>
public class ModulePresetDto
{
    public string Key { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string PlanLabel { get; set; } = default!;
    public List<string> Modules { get; set; } = [];
}

/// <summary>Row of the SuperAdmin subscriptions table.</summary>
public class CenterSubscriptionListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public bool IsActive { get; set; }

    /// <summary>Persisted center status (Active / Suspended / ...).</summary>
    public string Status { get; set; } = default!;

    /// <summary>Derived lifecycle state: Active / InGrace / Expired / Suspended.</summary>
    public string State { get; set; } = default!;

    public int DaysLeftInGrace { get; set; }

    /// <summary>Whole days until the end date (negative once lapsed); null for Lifetime.</summary>
    public int? DaysUntilExpiry { get; set; }

    /// <summary>True when an Active subscription ends within the highlight window (14 days).</summary>
    public bool ExpiringSoon { get; set; }

    public string? Type { get; set; }
    public string? Plan { get; set; }
    public DateTime? SubscriptionStart { get; set; }
    public DateTime? SubscriptionEnd { get; set; }
    public int GraceDays { get; set; }

    public decimal Price { get; set; }
    public decimal PaidAmount { get; set; }
    public string? Currency { get; set; }

    public int EnabledModuleCount { get; set; }
    public int TotalModuleCount { get; set; }
}

/// <summary>Full subscription + module configuration for one center.</summary>
public class CenterSubscriptionDetailDto
{
    public Guid CenterId { get; set; }
    public string CenterName { get; set; } = default!;
    public bool IsActive { get; set; }

    public string Status { get; set; } = default!;
    public string State { get; set; } = default!;
    public int DaysLeftInGrace { get; set; }
    public int? DaysUntilExpiry { get; set; }
    public bool ExpiringSoon { get; set; }

    public string? Type { get; set; }
    public string? Plan { get; set; }
    public DateTime? SubscriptionStart { get; set; }
    public DateTime? SubscriptionEnd { get; set; }
    public int GraceDays { get; set; }

    public decimal Price { get; set; }
    public decimal PaidAmount { get; set; }
    public string? Currency { get; set; }
    public string? Notes { get; set; }

    public List<CenterModuleStateDto> Modules { get; set; } = [];
    public List<ModulePresetDto> Presets { get; set; } = [];
}

/// <summary>A module that stays enabled because another enabled module requires it.</summary>
public class ModuleConflictDto
{
    public string Module { get; set; } = default!;
    public string ModuleName { get; set; } = default!;
    public List<string> Dependents { get; set; } = [];
    public List<string> DependentNames { get; set; } = [];
}

/// <summary>A single recorded payment against a subscription.</summary>
public class CenterSubscriptionPaymentDto
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; }
    public string? Method { get; set; }
    public string? Note { get; set; }
}

/// <summary>One historical subscription row (a renewal appends a new row).</summary>
public class CenterSubscriptionHistoryItemDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = default!;
    public DateTime StartDate { get; set; }

    /// <summary>Null for Lifetime.</summary>
    public DateTime? EndDate { get; set; }

    public decimal Price { get; set; }
    public decimal PaidAmount { get; set; }
    public string? Currency { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<CenterSubscriptionPaymentDto> Payments { get; set; } = [];
}

/// <summary>Subscription history of a center plus its outstanding balance.</summary>
public class CenterSubscriptionHistoryDto
{
    public Guid CenterId { get; set; }
    public string CenterName { get; set; } = default!;

    /// <summary>Price of the most recent subscription.</summary>
    public decimal Price { get; set; }

    /// <summary>Paid amount of the most recent subscription.</summary>
    public decimal PaidAmount { get; set; }

    /// <summary>Remaining balance of the current subscription (Price - PaidAmount).</summary>
    public decimal RemainingAmount { get; set; }

    public string? Currency { get; set; }

    public List<CenterSubscriptionHistoryItemDto> Subscriptions { get; set; } = [];
}

/// <summary>
/// Result of resolving a proposed module set: the effective enabled modules, the
/// ones pulled in automatically as dependencies, the dependents that had to be
/// turned off too, and any unresolved conflicts (blocks).
/// </summary>
public class CenterModuleResolutionDto
{
    public Guid CenterId { get; set; }
    public List<string> Enabled { get; set; } = [];
    public List<string> AutoEnabled { get; set; } = [];
    public List<string> AutoEnabledNames { get; set; } = [];
    public List<string> ForceDisabled { get; set; } = [];
    public List<string> ForceDisabledNames { get; set; } = [];
    public List<ModuleConflictDto> Conflicts { get; set; } = [];
}


using CenterManagement.Data.AppMetaData;
using Microsoft.Extensions.Configuration;
using Microsoft.OpenApi;
using System.Security.Claims;

namespace CenterManagement.Infrustructure.ServiceExtentions;

public static class SerivesCollection
{
    public static IServiceCollection AddInfrastructureServices(
      this IServiceCollection services,
      IConfiguration configuration)
    {
        services
            .EnableLocalization()
            .EnableCORS()
            .EnableIUrlHelper()
            .AddServiceRegisteration(configuration)
            .AddServiceAuthentication(configuration)
            .AddServiceAuthorization(configuration);

        return services;
    }

    //EnableLocalization
    public static IServiceCollection EnableLocalization(this IServiceCollection services)
    {
        services.AddControllersWithViews();
        services.AddLocalization(opt =>
        {
            opt.ResourcesPath = "";
        });

        services.Configure<RequestLocalizationOptions>(options =>
        {
            List<CultureInfo> supportedCultures = new List<CultureInfo>
            {
                    new CultureInfo("en-US"),
                    new CultureInfo("de-DE"),
                    new CultureInfo("fr-FR"),
                    new CultureInfo("ar-EG")
            };

            options.DefaultRequestCulture = new RequestCulture("en-US");
            options.SupportedCultures = supportedCultures;
            options.SupportedUICultures = supportedCultures;
        });
        return services;
    }

    //EnableCORS
    public static IServiceCollection EnableCORS(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("AllowCORS", policy =>
            {
                policy
                    .WithOrigins(
                       
                        "http://localhost:5173",
                       
                        "https://center-management-system-v02.vercel.app"
                    )
                    .AllowAnyMethod()              // GET, POST, PUT, PATCH, DELETE
                    .AllowAnyHeader()              // Content-Type, Authorization, etc.
                    .AllowCredentials();           // Allow cookies/auth headers
            });
        });

        return services;
    }

    //EnableIUrlHelper
    public static IServiceCollection EnableIUrlHelper(this IServiceCollection services)
    {
        services.AddSingleton<IActionContextAccessor, ActionContextAccessor>();

        services.AddScoped<IUrlHelper>(serviceProvider =>
        {
            var actionContext = serviceProvider
                .GetRequiredService<IActionContextAccessor>()
                .ActionContext;

            var factory = serviceProvider.GetRequiredService<IUrlHelperFactory>();

            return factory.GetUrlHelper(actionContext);
        });
        return services;
    }



    public static IServiceCollection AddServiceRegisteration(this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddIdentity<User, Role>(option =>
        {

            // Password settings.
            option.Password.RequireDigit = false;
            option.Password.RequireLowercase = false;
            option.Password.RequireNonAlphanumeric = false;
            option.Password.RequireUppercase = false;
            option.Password.RequiredLength = 6;

            option.User.RequireUniqueEmail = false;


            // Lockout settings.
            option.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
            option.Lockout.MaxFailedAccessAttempts = 5;
            option.Lockout.AllowedForNewUsers = true;

            // User settings.
            option.User.AllowedUserNameCharacters =
                        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";

        }).AddEntityFrameworkStores<AppDbContext>().AddDefaultTokenProviders();

        //JWT Authentication
        var jwtSettings = new JwtSettings();
        var emailSettings = new EmailSettings();

        configuration.GetSection(nameof(jwtSettings)).Bind(jwtSettings);
        configuration.GetSection(nameof(emailSettings)).Bind(emailSettings);

        services.AddSingleton(jwtSettings);
        services.AddSingleton(emailSettings);


        return services;
    }


    public static IServiceCollection AddSwaggerGen(this IServiceCollection services, IConfiguration configuration)
    {
        //Swagger Gn
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            { Title = "CenterManagement Project", Version = "v1" });

            // 1. تعريف الـ Security Scheme الأساسي
            var securityScheme = new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.ApiKey,
                Scheme = JwtBearerDefaults.AuthenticationScheme,
                BearerFormat = "JWT",
                Description = "JWT Authorization header using the Bearer scheme (Example: 'Bearer 12345abcdef')",
                In = ParameterLocation.Header,
            };

            c.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, securityScheme);

            // 2. تعريف الـ Reference المطلوبة
            var schemeReference = new OpenApiSecuritySchemeReference(JwtBearerDefaults.AuthenticationScheme);

            // 3. التعديل القاتل: باصينا الـ Requirement جوة Lambda Expression (doc => ...)
            c.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
            {
                { schemeReference, new List<string>() }
            });
            //c.AddSecurityRequirement(new OpenApiSecurityRequirement
            //{
            //    {
            //        new OpenApiSecurityScheme
            //        {
            //            Reference = new OpenApiReference
            //            {
            //                Type = ReferenceType.SecurityScheme,
            //                Id = "Bearer"
            //            }
            //        },
            //        Array.Empty<string>()
            //    }
            //});
        });

        return services;
    }


    //AddServiceAuthentication
    public static IServiceCollection AddServiceAuthentication(this IServiceCollection services, IConfiguration configuration)
    {

        services.ConfigureApplicationCookie(options =>
        {
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.None;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        });

        var jwtKey = configuration["jwtSettings:secret"]!;

        services.AddAuthentication(
            options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;

            })
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = true;
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        // Allow SignalR hubs to receive the JWT via the query string
                        // (accessTokenFactory) since browsers can't set headers on websockets.
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;

                        if (!string.IsNullOrEmpty(accessToken) &&
                            path.StartsWithSegments("/hubs"))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    },

                    OnTokenValidated = context =>
                    {
                        //Console.WriteLine("TOKEN VALIDATED");
                        return Task.CompletedTask;
                    },
                    OnAuthenticationFailed = context =>
                    {
                        //Console.WriteLine("------------------------------ ERROR:");
                        //Console.WriteLine(context.Exception.Message);

                        return Task.CompletedTask;
                    },


                };

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                                                  Encoding.UTF8.GetBytes(jwtKey)),
                    ValidateIssuer = false,
                    ValidIssuer = configuration["jwtSettings:Issuer"],
                    ValidateAudience = false,
                    ValidAudience = configuration["jwtSettings:Audience"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero    // No grace period
                };
            });

        return services;

    }
    //AddServiceAuthorization
    public static IServiceCollection AddServiceAuthorization(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddAuthorization(option =>
        {
            option.AddPolicy("CreateCategory", policy =>
            {
                policy.RequireClaim("Create CAtegory", "True");
            });
            option.AddPolicy("DeleteCategory", policy =>
            {
                policy.RequireClaim("Delete Category", "True");
            });
            option.AddPolicy("EditCategory", policy =>
            {
                policy.RequireClaim("Edit Category", "True");
            });

            option.AddPolicy(AppPolicies.PlatformAdmin, policy =>
            {
                policy.RequireRole(AppRoles.SuperAdmin);
            });

            option.AddPolicy(AppPolicies.CenterAdmin, policy =>
            {
                policy.RequireAssertion(context => IsCenterAdmin(context.User));
            });

            // Day-to-day academic tools (students, attendance, sessions, exams,
            // question bank, notes). Center owners are managers, not operators,
            // so they are deliberately excluded here.
            option.AddPolicy(AppPolicies.Operational, policy =>
            {
                policy.RequireAssertion(context =>
                    context.User.IsInRole(AppRoles.Assistant)
                    || context.User.IsInRole(AppRoles.Teacher));
            });

            option.AddPolicy(AppPolicies.CenterAdminAssistant, policy =>
            {
                policy.RequireAssertion(context =>
                    IsCenterAdmin(context.User)
                    || context.User.IsInRole(AppRoles.Assistant));
            });

            option.AddPolicy(AppPolicies.CenterAdminAcademic, policy =>
            {
                policy.RequireAssertion(context =>
                    IsCenterAdmin(context.User)
                    || context.User.IsInRole(AppRoles.Assistant)
                    || context.User.IsInRole(AppRoles.Teacher));
            });

            option.AddPolicy(AppPolicies.CenterAdminTeacher, policy =>
            {
                policy.RequireAssertion(context =>
                    IsCenterAdmin(context.User)
                    || context.User.IsInRole(AppRoles.Teacher));
            });
        });
        return services;
    }

    private static bool IsCenterAdmin(ClaimsPrincipal user) =>
        user.IsInRole(AppRoles.CenterOwner)
        || user.IsInRole(AppRoles.SuperAdmin)
        || user.HasClaim(AppPolicies.IsCenterAdminClaim, AppPolicies.TrueValue);

}

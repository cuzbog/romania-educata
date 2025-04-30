library(knitr)
library(kableExtra)

knitr::opts_chunk$set(
  message = FALSE,
  warning = FALSE,
  dev = "png",
  fig.width = 10,
  fig.height = 5,
  fig.align = "center",
  dpi = 300,
  fig.align = "center",
  dev.args = list(family = "serif")
)

library(stargazer)

library(DBI)
library(dplyr)
library(sf)
library(ggplot2)

latex_palette <- c(
  "darkred",  # black/dark gray
  "#3B738F",  # muted blue
  "#D55E00",  # rust orange
  "#0072B2",  # teal blue
  "#009E73",  # green
  "#E69F00",  # amber
  "#CC79A7",   # purple/magenta,
  "#999999",     # LaTeX-style mid gray
  "#332288",     # rich indigo
  "#F0E442"
)


theme_set(
  theme_minimal(base_size = 12, base_family = "Latin Modern Roman") +
    theme(
      plot.title = element_text(face = "bold", hjust = 0.5),
      axis.title = element_text(face = "bold"),
      axis.text = element_text(color = "black"),
      legend.title = element_text(face = "bold"),
      panel.grid.minor = element_blank()
    )
)

theme_map <- function() {
  theme_void() +
  theme(
    text = element_text(family = "Latin Modern Roman", size = 12),
    plot.title = element_text(face = "bold", hjust = 0.5),
    legend.title = element_text(face = "bold")
  )
}



scale_color_manual(values = latex_palette)
scale_fill_manual(values = latex_palette)

scale_colour_discrete <- function(...) scale_color_manual(values = latex_palette, ...)
scale_fill_discrete <- function(...) scale_fill_manual(values = latex_palette, ...)

update_geom_defaults("point", list(colour = latex_palette[1]))
update_geom_defaults("bar", list(fill = latex_palette[1]))
update_geom_defaults("col", list(fill = latex_palette[1]))
update_geom_defaults("line", list(colour = latex_palette[2]))




con <- dbConnect(RPostgres::Postgres(),
                 dbname = "romania_edu",
                 host = "localhost", # or your remote host
                 port = 5432)

geo <- st_read("../data/ROU.geojson")

# List all tables
tables <- dbListTables(con)

# Download all tables into a named list of data frames
db_data <- lapply(tables, function(tbl) dbReadTable(con, tbl))
names(db_data) <- tables

# Optionally, assign each as a separate data frame in your global environment
list2env(db_data, .GlobalEnv)

library(tidyverse)

save_latex_table <- function(tbl, file, caption = NULL, digits = 2) {
  label <- tools::file_path_sans_ext(basename(file))
  
  out <- kable(tbl,
               format = "latex",
               booktabs = TRUE,
               digits = digits,
               label = label,
               caption = caption) %>%
    kable_styling(latex_options = c("hold_position"))
  dir.create(dirname(file), showWarnings = FALSE, recursive = TRUE)
  cat(out, file = file)
}

escape_latex_caption <- function(text) {
  text <- gsub("\\\\", "\\\\textbackslash{}", text)
  text <- gsub("([%#&_$^{}~])", "\\\\\\1", text, perl = TRUE)
  return(text)
}


save_model_tex <- function(model, file, title = NULL, stars = TRUE, ...) {
  
  if (!is.null(title)) {
    title <- escape_latex_caption(title)
  }
  
  label <- paste0("tab:", tools::file_path_sans_ext(basename(file)))
  
  stargazer::stargazer(
    model,
    type = "latex",
    out = file,
    title = title,
    label = label,
    header = FALSE,
    ...
  )
  
}


# needed to fix this initially
bac_2024 <- bac_2024 %>%
  mutate(
    ro_grade = coalesce(ro_grade_contest, ro_grade),
    non_ro_grade = coalesce(non_ro_grade_contest, non_ro_grade),
    profil_grade = coalesce(profil_grade_contest, profil_grade),
    choice_grade = coalesce(choice_grade_contest, choice_grade)
  )

df_full <- bac_2024 %>% left_join(school_info, by = c("school_code" = "id"))

bac_analysis <- df_full %>%
  mutate(
    passed = ifelse(result == "Promovat", TRUE, FALSE),
    absent = ifelse(result == "Absent" | result == "Eliminat", TRUE, FALSE)
  ) %>%
  filter(!is.na(mediu) & !is.na(sex))

# Calculate participation and pass rates by environment and sex
participation_by_env_sex <- bac_analysis %>%
  group_by(mediu, sex) %>%
  summarise(
    total = n(),
    absent_count = sum(absent, na.rm = TRUE),
    present_count = total - absent_count,
    passed_count = sum(passed, na.rm = TRUE),
    absent_rate = absent_count / total * 100,
    pass_rate = passed_count / present_count * 100
  ) %>%
  ungroup()

print(participation_by_env_sex)
save_latex_table(
  participation_by_env_sex,
  file = "tables/participation_by_env_sex.tex",
  caption = "Bacalaureat Participation and Pass Rates by Gender and Environment",
  digits = 1
)


library(ggplot2)
library(tidyr)

# reshape to long format for proper dodging
plot_data <- participation_by_env_sex %>%
  pivot_longer(cols = c(absent_rate, pass_rate), names_to = "metric", values_to = "value") %>%
  mutate(group = paste(mediu, sex))

# plot
ggplot(plot_data, aes(x = group, y = value, fill = metric)) +
  geom_col(position = position_dodge(width = 0.8), width = 0.7) +
  scale_fill_discrete(
    labels = c("absent_rate" = "Absent Rate (%)", "pass_rate" = "Pass Rate (%)")
  ) +
  labs(
    x = NULL,
    y = "Percentage",
    title = ,
    fill = NULL
  )




df_nobucharest <- df_full %>%
  filter(judet != "B")

plot_grade_density <- function(data, title_suffix) {
  ggplot(data, aes(x = mean_grade, color = sex, linetype = mediu)) +
    scale_linetype_manual(values = c("urban" = "solid", "rural" = "dashed")) +
    geom_density(adjust = 1.2, linewidth = 1) +
    labs(
      x = "Mean grade",
      y = "Density",
      color = "Sex",
      linetype = "Environment"
    )
}
plot_grade_density(df_full, "(all counties)")
plot_grade_density(df_nobucharest, "(Bucharest removed)")

ggplot(df_full, aes(x = mean_grade, color = sex, linetype = mediu)) +
  stat_ecdf(aes(y = after_stat(1 - y)), geom = "step", size = 1, pad = FALSE) +
  scale_y_continuous(labels = scales::percent_format()) +
  scale_linetype_manual(values = c("urban" = "solid", "rural" = "dashed")) +
  labs(
    x = "Average grade",
    y = "Share of students with grade at least x",
    color = "Sex",
    linetype = "Environment"
  )


en_school_summary <- en_2024 %>%
  group_by(school_code) %>%
  summarize(en_median = median(mean_grade, na.rm = TRUE),
            en_n = n())


bac_school_summary <- bac_2024 %>%
  group_by(school_code) %>%
  summarize(bac_median = median(mean_grade, na.rm = TRUE),
            bac_n = n())

joined <- inner_join(en_school_summary, bac_school_summary, by = "school_code")
joined <- joined %>%
  left_join(select(school_info, id, mediu, proprietate), by = c("school_code" = "id"))

cor(joined$en_median, joined$bac_median, use = "complete.obs")

ggplot(joined, aes(x = en_median, y = bac_median, color = mediu)) +
  geom_point(alpha = 0.6) +
  geom_smooth(method = "lm", se = FALSE) +
  labs(
    x = "Median EN Grade",
    y = "Median Bac Grade",
    color = "Environment",
  )


joined <- joined %>%
  mutate(high_bac = as.integer(bac_median >= 8))

logit_model <- glm(high_bac ~ en_median, data = joined, family = "binomial")
summary(logit_model)

save_model_tex(
  logit_model,
  file = "tables/logit_en_predicts_bac.tex",
  title = "Logistic regression: Does EN median predict high BAC median?"
)


newdata <- tibble(en_median = seq(3, 9.5, by = 0.1))
newdata$predicted_prob <- predict(logit_model, newdata, type = "response")

ggplot(newdata, aes(x = en_median, y = predicted_prob)) +
  geom_line() +
  labs(x = "Median EN Grade", y = "P(Bac Median at least 8)", )

joined_clean <- joined %>%
  filter(!is.na(en_median) & !is.na(bac_median))

model <- lm(bac_median ~ en_median, data = joined_clean)
joined_clean$residual <- abs(resid(model))

top_consistent <- joined_clean %>%
  arrange(residual) %>%
  select(school_code, en_median, bac_median, residual) %>%
  head(10)


top_named <- top_consistent %>%
  left_join(school_info, by = c("school_code" = "id")) %>%
  select(nume, judet, localitate, everything()) 

joined_urban <- joined %>%
  filter(mediu == "urban")

ggplot(joined_urban, aes(x = en_median, y = bac_median, color = proprietate)) +
  geom_point(alpha = 0.7) +
  geom_smooth(method = "lm", se = FALSE) +
  labs(
    x = "Median EN Grade",
    y = "Median Bac Grade",
    color = "Ownership",
  )


tbl <- bac_2024 %>%
  filter(result == "Promovat") %>%
  count(foreign_lang_exam) %>%
  mutate(percentage = 100 * n / sum(n))

save_latex_table(
  tbl,
  file = "tables/foreign_lang_exam_certified.tex",
  caption = "Distribution of foreign language certifications among students who passed the BAC",
  digits = 1
)

bac_2024 %>%
  filter(result == "Promovat") %>%
  filter(foreign_lang_exam %in% c("Certificat", "Calificativ")) %>%
  ggplot(aes(x = foreign_lang_exam, y = mean_grade)) +
  geom_boxplot() +
  labs(
       x = "Exam Type", y = "BAC Mean Grade")


schools_with_mix <- bac_2024 %>%
  filter(result == "Promovat") %>%
  filter(foreign_lang_exam %in% c("Certificat", "Calificativ")) %>%
  group_by(school_code) %>%
  summarize(
    has_certificat = any(foreign_lang_exam == "Certificat"),
    has_calificativ = any(foreign_lang_exam == "Calificativ"),
    .groups = "drop"
  ) %>%
  filter(has_certificat & has_calificativ) %>%
  pull(school_code)

gap_by_school <- bac_2024 %>%
  filter(school_code %in% schools_with_mix,
         foreign_lang_exam %in% c("Certificat", "Calificativ")) %>%
  group_by(school_code, foreign_lang_exam) %>%
  summarize(avg_grade = mean(mean_grade, na.rm = TRUE), .groups = "drop") %>%
  pivot_wider(names_from = foreign_lang_exam, values_from = avg_grade) %>%
  mutate(grade_gap = Certificat - Calificativ)

ggplot(gap_by_school, aes(x = grade_gap)) +
  geom_histogram(binwidth = 0.1, boundary = 0) +
  geom_vline(xintercept = 0, linetype = "dashed") +
  labs(
    x = "Mean Grade Gap",
    y = "Number of Schools"
  )

bac_reg_data <- bac_2024 %>%
  filter(result == "Promovat", filiera == "Teoretică", foreign_lang_exam %in% c("Certificat", "Calificativ")) %>%
  mutate(certificat = as.integer(foreign_lang_exam == "Certificat"))

model <- lm(mean_grade ~ certificat + profil, data = bac_reg_data)
summary(model)
save_model_tex(
  model,
  file = "tables/certificat_vs_grade.tex",
  title = "Effect of foreign language certification and profile on BAC mean grade"
)


cert_rate_by_school <- bac_2024 %>%
  filter(foreign_lang_exam %in% c("Certificat", "Calificativ")) %>%
  group_by(school_code) %>%
  summarize(
    pct_certificat = mean(foreign_lang_exam == "Certificat", na.rm = TRUE),
    n_students = n()
  )

nonpass_by_school <- bac_2024 %>%
  group_by(school_code) %>%
  summarize(
    nonpass_rate = mean(result %in% c("Absent", "Eliminat"), na.rm = TRUE),
    n_students = n()
  )

school_outcomes <- cert_rate_by_school %>%
  inner_join(nonpass_by_school, by = "school_code")

cor(school_outcomes$pct_certificat, school_outcomes$nonpass_rate, use = "complete.obs")



school_model_data <- bac_2024 %>%
  left_join(school_info, by = c("school_code" = "id")) %>%
  mutate(nonpass = result %in% c("Absent", "Eliminat"),
         certificat = foreign_lang_exam == "Certificat",
         is_bucharest = judet == "B") %>%
  group_by(school_code) %>%
  summarize(
    nonpass_rate = mean(nonpass, na.rm = TRUE),
    pct_certificat = mean(certificat, na.rm = TRUE),
    pct_female = mean(sex == "F", na.rm = TRUE),
    rural = first(mediu == "rural"),
    is_bucharest = first(is_bucharest),
    n_students = n(),
    log_n_students = log(n_students + 1),
    .groups = "drop"
  )


model2 <- lm(nonpass_rate ~ pct_certificat + pct_female + rural *log_n_students + is_bucharest , data = school_model_data)
summary(model2)

save_model_tex(
  model2,
  file = "tables/nonpass_regression.tex",
  title = "OLS regression: Predicting nonpass rate from certificate share, gender, size, and location"
)


subject_dispersion <- bac_2024 %>%
  mutate(subject_sd = apply(select(., ro_grade, profil_grade, choice_grade), 1, sd, na.rm = TRUE)) %>%
  group_by(school_code) %>%
  summarize(mean_subject_sd = mean(subject_sd, na.rm = TRUE),
            n_students = n())

ggplot(subject_dispersion, aes(x = mean_subject_sd)) +
  geom_histogram(binwidth = 0.05) +
  labs(
       x = "Average Student Subject SD (per School)",
       y = "Number of Schools")


mean_grade_by_school <- bac_2024 %>%
  filter(filiera == "Teoretică") %>%
  group_by(school_code) %>%
  summarize(mean_grade = mean(mean_grade, na.rm = TRUE))

subject_dispersion_joined <- subject_dispersion %>%
  left_join(mean_grade_by_school, by = "school_code")

cor(subject_dispersion_joined$mean_subject_sd, subject_dispersion_joined$mean_grade, use = "complete.obs")

ggplot(subject_dispersion_joined, aes(x = mean_subject_sd, y = mean_grade)) +
  geom_point(alpha = 0.6) +
  geom_smooth(method = "lm", se = FALSE, color = "blue") +
  labs(
       x = "Avg Student Subject SD", y = "School Mean BAC Grade")


bac_school_counts <- bac_2024 %>%
  left_join(school_info, by = c("school_code" = "id")) %>%
  filter(mediu == "rural") %>%
  distinct(judet, localitate, school_code) %>%
  group_by(judet, localitate) %>%
  summarize(n_schools = n(), .groups = "drop") %>%
  filter(n_schools >= 2)

print(bac_school_counts)
save_latex_table(
  bac_school_counts,
  file = "tables/rural_localities_with_multiple_schools.tex",
  caption = "Rural localities with at least two BAC-participating schools",
  digits = 0
)


school_perf <- df_full %>%
  group_by(judet, localitate, school_code) %>%
  summarize(median_exam = median(mean_grade, na.rm = TRUE), .groups = "drop")

town_variation <- school_perf %>%
  group_by(judet, localitate) %>%
  summarize(sd_between_schools = sd(median_exam, na.rm = TRUE), n_schools = n()) %>%
  filter(n_schools >= 3)

town_type <- df_full %>%
  group_by(judet, localitate) %>%
  summarize(
    pct_urban = mean(mediu == "urban"),
    town_type = ifelse(pct_urban >= 0.5, "urban", "rural"),
    .groups = "drop"
  )

town_variation <- town_variation %>%
  left_join(town_type, by = c("judet", "localitate"))

county_stratification <- town_variation %>%
  group_by(judet, town_type) %>%
  summarize(
    mean_sd = mean(sd_between_schools, na.rm = TRUE),
    median_sd = median(sd_between_schools, na.rm = TRUE),
    n_towns = n(),
    .groups = "drop"
  )



geo$centroid <- st_centroid(geo$geometry)
centroids <- st_coordinates(geo$centroid)

geo_urban <- geo %>%
  left_join(
    filter(county_stratification, town_type == "urban"),
    by = c("mnemonic" = "judet")
  )

geo_urban$label_x <- centroids[,1]
geo_urban$label_y <- centroids[,2]



ggplot(geo_urban) +
  geom_sf(aes(fill = mean_sd), color = "white") +
  geom_text(
    aes(x = label_x, y = label_y, label = mnemonic),
    size = 3,
    color = "white",
    family = "Latin Modern Roman"
  ) +
  scale_fill_viridis_c(option = "plasma", na.value = "grey90", name = "Urban\nSD", direction = -1) +
  theme_map()

county_pass_rates <- df_full %>%
  mutate(passed = result == "Promovat") %>%
  group_by(judet) %>%
  summarize(pass_rate = mean(passed, na.rm = TRUE))

geo_pass <- geo %>%
  left_join(county_pass_rates, by = c("mnemonic" = "judet"))

geo_pass$label_x <- centroids[,1]
geo_pass$label_y <- centroids[,2]

ggplot(geo_pass) +
  geom_sf(aes(fill = pass_rate), color = "white") +
  geom_text(
    aes(x = label_x, y = label_y, label = mnemonic),
    size = 3,
    color = "white",
    family = "Latin Modern Roman"
  ) +
  scale_fill_viridis_c(option = "mako", na.value = "grey90", name = "Pass Rate") +
  theme_map()



get_rom_barrier_stats <- function(lang_code, lang_label) {
  lang_students <- bac_2024 %>%
    filter(non_romanian_lang == lang_code)

  rom_barrier <- lang_students %>%
    filter(!result %in% c("Absent", "Eliminat")) %>%
    mutate(
      adjusted_mean_if_ro_5 = (5 + profil_grade + choice_grade + non_ro_grade) / 4
    ) %>%
    filter(
      ro_grade < 5,
      profil_grade >= 5,
      choice_grade >= 5,
      non_ro_grade >= 5,
      adjusted_mean_if_ro_5 >= 6
    )

  tibble(
    lang_type = lang_label,
    n_total = nrow(lang_students),
    n_barrier = nrow(rom_barrier),
    barrier_pct = 100*nrow(rom_barrier) / nrow(lang_students)
  )
}


barrier_summary <- bind_rows(
  get_rom_barrier_stats("maghiară", "hungarian"),
  get_rom_barrier_stats("germană", "german")
)

print(barrier_summary)

save_latex_table(
  barrier_summary,
  file = "tables/romanian_barrier_summary.tex",
  caption = "Estimated share of students who would pass BAC if not for the Romanian language exam (by minority language)",
  digits = 1
)


lang_students <- bac_2024 %>%
    filter(non_romanian_lang == "maghiară")
rom_barrier <- lang_students %>%
    filter(!result %in% c("Absent", "Eliminat")) %>%
    mutate(
      adjusted_mean_if_ro_5 = (5 + profil_grade + choice_grade + non_ro_grade) / 4
    ) %>%
    filter(
      ro_grade < 5,
      profil_grade >= 5,
      choice_grade >= 5,
      non_ro_grade >= 5,
      adjusted_mean_if_ro_5 >= 6
    )

rom_barrier_by_school <- rom_barrier %>%
  count(school_code, name = "n_barrier")

hungarian_present <- lang_students %>%
  filter(!result %in% c("Absent", "Eliminat")) %>%
  count(school_code, name = "n_present")

barrier_rate_by_school <- hungarian_present %>%
  left_join(rom_barrier_by_school, by = "school_code") %>%
  mutate(
    n_barrier = replace_na(n_barrier, 0),
    barrier_rate = n_barrier / n_present
  )
barrier_rate_by_school <- barrier_rate_by_school %>%
  left_join(school_info, by = c("school_code" = "id"))

save_latex_table(
  barrier_rate_by_school %>%
    select(barrier_rate, n_present, nume, localitate, judet),
  file = "tables/barrier_rate_by_school_hu.tex",
  caption = "Hungarian-language schools with high barrier rates",
  digits = 1
)



bac_sim <- bac_2024 %>%
  filter(!result %in% c("Absent", "Eliminat")) %>%
  mutate(
    lang_type = case_when(
      non_romanian_lang == "maghiară" ~ "hungarian",
      non_romanian_lang == "germană" ~ "german",
      TRUE ~ "romanian"
    ),
    native_lang_grade = case_when(
      lang_type == "romanian" ~ ro_grade,
      lang_type == "hungarian" ~ non_ro_grade,
      lang_type == "german" ~ non_ro_grade
    ),
    simulated_mean = (native_lang_grade + profil_grade + choice_grade) / 3,
    simulated_pass = (
      native_lang_grade >= 5 &
      profil_grade >= 5 &
      choice_grade >= 5 &
      simulated_mean >= 6
    )
  )


tbl <- bac_sim %>%
  group_by(lang_type) %>%
  summarize(simulated_pass_rate = mean(simulated_pass, na.rm = TRUE))

save_latex_table(
  tbl,
  file = "tables/simulated_pass_rate_by_lang.tex",
  caption = "Simulated BAC pass rates by language track assuming Romanian grade is replaced with 5",
  digits = 1
)



model_df <- bac_2024 %>%
  left_join(school_info, by = c("school_code" = "id")) %>%
  group_by(school_code) %>%
  mutate(n_students = n()) %>%
  ungroup() %>%
  group_by(judet, localitate) %>%
  mutate(num_schools_in_town = n_distinct(school_code)) %>%
  ungroup() %>%
  mutate(
    certificat = foreign_lang_exam == "Certificat"
  ) %>%
  select(sex, profil, mediu, certificat, school_code, judet, localitate, proprietate,
         n_students, num_schools_in_town, ro_grade, non_ro_grade,
         choice_grade, profil_grade, non_romanian_lang, result)

library(jsonlite)
# Step 2: Flatten demographic JSON
dem_data <- fromJSON("../data/demographics/total.json")

town_demographics <- purrr::map_dfr(names(dem_data$cities), function(judet) {
  purrr::map_dfr(names(dem_data$cities[[judet]]$cities), function(loc) {
    city_data <- dem_data$cities[[judet]]$cities[[loc]]$population
    tibble(
      judet = judet,
      localitate = loc,
      total_population = city_data$total
    )
  })
})

county_edu <- purrr::map_dfr(names(dem_data$cities), function(judet) {
  edu <- dem_data$cities[[judet]]$population$education$overall
  tibble(
    judet = judet,
    total_population = edu$total,
    high_school = edu$high_school,
    undergraduate = edu$undergraduate,
    graduate = edu$graduate,
    vocational = edu$vocational,
    illiterate = edu$illiterate,
    no_education = edu$no_education,
    total_secondary = edu$total_secondary
  )
}) %>%
  mutate(
    pct_higher_ed = (undergraduate + graduate) / total_population,
    pct_high_school = high_school / total_population,
    pct_vocational = vocational / total_population,
    pct_illiterate = illiterate / total_population,
    pct_no_education = no_education / total_population,
    pct_secondary = total_secondary / total_population
  ) %>%
  select(judet, starts_with("pct_"))

# Step 4: Join to model_df
model_df <- model_df %>%
  left_join(town_demographics, by = c("judet", "localitate")) %>%
  left_join(county_edu, by = "judet")


model_df <- model_df %>%
  mutate(
    lang_type = case_when(
      non_romanian_lang == "maghiară" ~ "hungarian",
      non_romanian_lang == "germană" ~ "german",
      TRUE ~ "romanian"
    ),
    native_lang_grade = if_else(lang_type == "romanian", ro_grade, non_ro_grade),
    native_pass = (
      !result %in% c("Absent", "Eliminat") &
      native_lang_grade >= 5 &
      profil_grade >= 5 &
      choice_grade >= 5 &
      (if_else(lang_type == "romanian",
               (ro_grade + profil_grade + choice_grade) / 3,
               (non_ro_grade + profil_grade + choice_grade) / 3) >= 6)
    )
  )

model_rom <- model_df %>% filter(lang_type == "romanian")  %>%
  mutate(mediu_proprietate = interaction(mediu, proprietate)) %>%
  mutate(
    schools_per_capita = num_schools_in_town / total_population,
    mediu = as.factor(mediu),
    proprietate = as.factor(proprietate)
  )
model <- glm(native_pass ~ sex + profil + certificat +
               log(n_students) + log(total_population) + mediu_proprietate + schools_per_capita +
               pct_higher_ed + pct_vocational + pct_illiterate,
             data = model_rom,
             family = binomial())

library(car)
vif(model)

model_rom <- model_rom %>%
  mutate(predicted_pass_prob = predict(model, newdata = model_rom, type = "response")) %>%
  mutate(predicted_class = predicted_pass_prob >= 0.5)

accuracy <- model_rom %>%
  summarize(accuracy = mean(predicted_class == native_pass, na.rm = TRUE))

print(accuracy)

vif_raw <- car::vif(model)

vif_tbl <- if (is.matrix(vif_raw)) {
  tibble::tibble(
    Variable = rownames(vif_raw),
    VIF = vif_raw[, 1]
  )
} else {
  tibble::tibble(
    Variable = names(vif_raw),
    VIF = vif_raw
  )
}

save_model_tex(
  model,
  file = "tables/native_pass_logit.tex",
  title = "Logistic regression: Predictors of BAC passing"
)


vif_tbl <- tibble::tibble(
  Variable = names(car::vif(model)),
  VIF = as.numeric(car::vif(model))
)

kable(vif_tbl, format = "latex", booktabs = TRUE, digits = 2,
      caption = "Variance inflation factors for predictors of BAC passing", 
      col.names = c("Variable", "VIF")) %>%
  save_kable("tables/native_pass_vif.tex")



library(pROC)
roc_rom <- roc(model_rom$native_pass, model_rom$predicted_pass_prob)
auc(roc_rom)


summary(model)

model_df <- model_df %>%
  mutate(
    mediu_proprietate = interaction(mediu, proprietate),
    schools_per_capita = num_schools_in_town / total_population,
    predicted_pass_prob = predict(model, newdata = cur_data(), type = "response")
  )

tbl <- model_df %>%
  group_by(lang_type) %>%
  summarize(
    predicted_pass = mean(predicted_pass_prob, na.rm = TRUE),
    actual_pass = mean(native_pass, na.rm = TRUE),
    over_or_under = actual_pass - predicted_pass
  )

save_latex_table(
  tbl,
  file = "tables/model_pass_rate_comparison.tex",
  caption = "Predicted vs. actual BAC pass rates by language group",
  digits = 2
)


bac_teo <- bac_2024 %>%
  filter(filiera == "Teoretică") %>%
  left_join(school_info, by = c("school_code" = "id"))

tbl <- bac_teo %>%
  mutate(passed = result == "Promovat") %>%
  group_by(proprietate) %>%
  summarize(
    total_students = n(),
    pass_rate = mean(passed)*100
  )

save_latex_table(
  tbl,
  file = "tables/pass_rate_by_proprietate.tex",
  caption = "BAC pass rates and shares by school ownership type (public/private)",
  digits = 2
)


private_school_perf <- bac_teo %>%
  filter(proprietate == "privata") %>%
  group_by(school_code) %>%
  summarize(
    n_students = n(),
    pass_rate = mean(result == "Promovat", na.rm = TRUE)
  ) %>%
  left_join(school_info, by = c("school_code" = "id"))

ggplot(private_school_perf, aes(x = pass_rate)) +
  geom_histogram(bins = 30) + labs(
       x = "Pass Rate", y = "Number of Schools")


school_pass_rates <- bac_teo %>%
  group_by(school_code) %>%
  summarize(
    n_students = n(),
    pass_rate = mean(result == "Promovat", na.rm = TRUE),
    .groups = "drop"
  ) %>%
  left_join(select(school_info, id, mediu), by = c("school_code" = "id"))



ggplot(school_pass_rates, aes(x = pass_rate, weight = n_students, fill = mediu)) +
  geom_density(alpha = 0.5, position = "identity") +
  labs(
    x = "Pass Rate", y = "Weighted Density", fill = "Environment"
  )



urban_passed <- bac_2024 %>%
  filter(filiera == "Teoretică", result == "Promovat") %>%
  left_join(school_info, by = c("school_code" = "id")) %>%
  filter(mediu == "urban")

urban_passed %>%
  group_by(school_code) %>%
  summarize(
    median_grade = median(mean_grade, na.rm = TRUE),
    sd_grade = sd(mean_grade, na.rm = TRUE),
    n_students = n()
  ) %>%
  ggplot(aes(x = median_grade, y = sd_grade, size = n_students)) +
  geom_point(alpha = 0.7) +
  labs(
    x = "Median BAC Grade", y = "Grade Standard Deviation", size = "School Size"
  )


school_cert_grade <- urban_passed %>%
  group_by(school_code) %>%
  summarize(
    pct_certificat = mean(foreign_lang_exam == "Certificat", na.rm = TRUE),
    median_grade = median(mean_grade, na.rm = TRUE),
    n_students = n(),
    .groups = "drop"
  )

ggplot(school_cert_grade, aes(x = pct_certificat, y = median_grade, size = n_students)) +
  geom_point(alpha = 0.6) +
  geom_smooth(method = "lm", se = FALSE, show.legend = FALSE) +
  labs(
    x = "% of Students Using Foreign Language Certificate (Proxy for Wealth)",
    y = "Median BAC Grade",
    size = "School Size"
  )


cor(school_cert_grade$pct_certificat, school_cert_grade$median_grade, use = "complete.obs")


model <- lm(median_grade ~ log(n_students) + pct_certificat,
            data = school_cert_grade)
summary(model)

save_model_tex(
  model,
  file = "tables/median_grade_regression.tex",
  title = "OLS regression: Predicting school median BAC grade from enrollment and certificate rate"
)



# List all tables
tables <- dbListTables(con)

# Download all tables into a named list of data frames
db_data <- lapply(tables, function(tbl) dbReadTable(con, tbl))
names(db_data) <- tables

# Optionally, assign each as a separate data frame in your global environment
list2env(db_data, .GlobalEnv)

ambitious <- bac_2024 %>%
  left_join(school_info, by = c("school_code" = "id")) %>%
  filter(
    result == "Promovat",
    filiera == "Teoretică",
    mediu == "urban",
    foreign_lang_exam == "Certificat",
    mean_grade >= 8,
    ro_grade_contest > ro_grade | profil_grade_contest > profil_grade | choice_grade_contest > choice_grade
  )

school_age_pop <- purrr::map_dfr(names(dem_data$cities), function(judet) {
  age_data <- dem_data$cities[[judet]]$population$age
  tibble(
    judet = judet,
    school_age_pop = age_data$`10-14` + age_data$`15-19`
  )
})


ambitious_by_judet <- ambitious %>%
  count(judet, name = "n_ambitious") %>%
  left_join(school_age_pop, by = "judet") %>%
  mutate(ambitious_per_10k_youth = 10000 * n_ambitious / school_age_pop)


geo_ambitious <- geo %>%
  left_join(ambitious_by_judet, by = c("mnemonic" = "judet"))

geo_ambitious$label_x <- centroids[, 1]
geo_ambitious$label_y <- centroids[, 2]

ggplot(geo_ambitious) +
  geom_sf(aes(fill = ambitious_per_10k_youth), color = "white") +
  geom_text(
    aes(x = label_x, y = label_y, label = mnemonic),
    size = 3, color = "white", family = "Latin Modern Roman"
  ) +
  scale_fill_viridis_c(
    option = "plasma", na.value = "grey90",
    name = "Ambitious per\n10k youth", direction = -1
  ) +
  theme_map()

geo_ambitious_no_buc = geo_ambitious %>%
  filter(mnemonic != "B")

ggplot(geo_ambitious_no_buc) +
  geom_sf(aes(fill = ambitious_per_10k_youth), color = "white") +
  geom_text(
    aes(x = label_x, y = label_y, label = mnemonic),
    size = 3, color = "white", family = "Latin Modern Roman"
  ) +
  scale_fill_viridis_c(
    option = "plasma", na.value = "grey90",
    name = "Ambitious per\n10k youth", direction = -1
  ) +
  theme_map()




ambitious_by_school <- ambitious %>%
  count(school_code, name = "n_ambitious") %>%
  left_join(
    bac_2024 %>%
      left_join(select(school_info, id, mediu), by = c("school_code" = "id")) %>%
      filter(filiera == "Teoretică", result == "Promovat", mediu == "urban") %>%
      count(school_code, name = "n_passed"),
    by = "school_code"
  ) %>%
  mutate(pct_ambitious = n_ambitious / n_passed) %>%
  left_join(select(school_info, id, nume, judet, localitate, proprietate), by = c("school_code" = "id"))

ambitious_model <- loess(pct_ambitious ~ n_passed, data = ambitious_by_school)
ambitious_by_school$density_adjusted <- ambitious_model$residuals

ambitious_by_school %>%
  filter(n_passed >= 5) %>%
  ggplot(aes(x = n_ambitious, y = density_adjusted)) +
  geom_hline(yintercept = 0, linetype = "dashed") +
  geom_vline(xintercept = median(ambitious_by_school$n_ambitious, na.rm = TRUE), linetype = "dashed") +
  geom_point(aes(color = proprietate), alpha = 0.7, size = 2) +
  labs(
    x = "Number of Ambitious Students",
    y = "Ambition Residual (Adjusted for Size)",
    color = "School Type"
  ) 

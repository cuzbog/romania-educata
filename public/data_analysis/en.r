library(kableExtra)

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


df_full <- bac_2024 %>% left_join(school_info, by = c("school_code" = "id"))
df_nobucharest <- df_full %>%
  filter(judet != "B")

plot_grade_density <- function(data, title_suffix) {
  ggplot(data, aes(x = mean_grade, color = sex, linetype = mediu)) +
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
  stat_ecdf(geom = "step", size = 1, pad = FALSE) +
  scale_y_reverse(labels = scales::percent_format()) +
  labs(
    x = "Average grade",
    y = "Share of students with grade at least x",
    color = "Sex",
    linetype = "Environment"
  )




df_summary <- df_full %>%
  mutate(participated = !is.na(mean_grade)) %>%
  group_by(sex, mediu) %>%
  summarize(
    total = n(),
    num_missing = sum(!participated),
    pct_missing = mean(!participated) * 100
  )

save_latex_table(df_summary, "tables/absent_by_sex_env.tex",
                 caption = "Absent students by sex and environment")


school_participation <- df_full %>%
  group_by(school_code) %>%
  summarize(
    pct_missing = mean(is.na(mean_grade)),
    median_exam = median(mean_grade, na.rm = TRUE)
  )

ggplot(school_participation, aes(x = pct_missing, y = median_exam)) +
  geom_point(alpha = 0.5) +
  geom_smooth(method = "lm") +
  labs(x = "Absentee percentage", y = "Median EN grade (school)")


abnormal_schools <- school_participation %>%
  filter(pct_missing > 0.75, median_exam > 7) %>%
  left_join(school_info %>% select(id, nume, localitate, judet, mediu), 
            by = c("school_code" = "id"))

save_latex_table(abnormal_schools, "tables/high_absent_high_scores.tex",
                 caption = "Schools with high absenteeism and high median grade")

plot_school_grade_density <- function(data, title_suffix) {
  ggplot(data, aes(x = mean_grade_school, color = sex, linetype = mediu)) +
    geom_density(adjust = 1.2, linewidth = 1) +
    labs(
      x = "Mean grade before exam",
      y = "Density",
      color = "Sex",
      linetype = "Environment"
    )
}
plot_school_grade_density(df_full, "(all counties)")
plot_school_grade_density(df_nobucharest, "(Bucharest removed)")


summary_table <- df_full %>%
  group_by(sex, mediu) %>%
  summarize(
    n = n(),
    median_grade = median(mean_grade, na.rm = TRUE),
    pct_above_8 = mean(mean_grade >= 8, na.rm = TRUE) * 100
  ) %>%
  ungroup()

save_latex_table(summary_table %>%
                   mutate(pct_above_8 = paste0(round(pct_above_8, 1), "%")),
                 "tables/performance_by_group.tex",
                 caption = "Summary of EN performance by sex and environment")

gap_by_county <- df_nobucharest %>%
  filter(!is.na(mean_grade)) %>%
  group_by(judet, sex, mediu) %>%
  summarize(median_grade = median(mean_grade), .groups = "drop") %>%
  pivot_wider(names_from = c(sex, mediu), values_from = median_grade) %>%
  mutate(
    gap = `F_urban` - `M_rural`
  ) %>%
  arrange(desc(gap))


save_latex_table(
  tbl = gap_by_county %>% select(judet, `F_urban`, `M_rural`, gap),
  file = "tables/urban_girls_vs_rural_boys_gap.tex",
  caption = "Median grade difference by county: urban girls vs. rural boys",
  digits = 2
)


df_plot <- df_full %>%
  filter(!is.na(mean_grade)) %>%
  group_by(judet, sex, mediu) %>%
  summarize(median_grade = median(mean_grade), .groups = "drop")

ggplot(df_plot, aes(x = reorder(judet, -median_grade), y = median_grade, color = mediu, shape = sex)) +
  geom_point(position = position_dodge(width = 0.5), size = 2.5) +
  labs(
    x = "County (Județ)",
    y = "Median Grade",
    color = "Environment",
    shape = "Sex"
  ) +
  theme(axis.text.x = element_text(angle = 90, hjust = 1))


gender_gap_table <- df_full %>%
  filter(!is.na(mean_grade)) %>%
  group_by(judet, sex, mediu) %>%
  summarize(median_grade = median(mean_grade), .groups = "drop") %>%
  pivot_wider(names_from = sex, values_from = median_grade) %>%
  mutate(gap = F - M) %>%
  select(judet, mediu, gap) %>%
  pivot_wider(names_from = mediu, values_from = gap, names_sort = TRUE)

library(knitr)
library(kableExtra)

save_latex_table(
  tbl = gender_gap_table,
  file = "tables/gender_gap_by_county_and_environment.tex",
  caption = "EN median grade sex difference by county and environment",
  digits = 2
)



df_model <- df_full %>%
  filter(!is.na(mean_grade)) %>%
  mutate(
    is_bucharest = (judet == "B"),
    sex = factor(sex),
    mediu = factor(mediu)
  )

model <- lm(mean_grade ~ sex * mean_grade_school + mediu + is_bucharest, data = df_model)
summary(model)

save_model_tex(
  model,
  file = "tables/model_exam_vs_school.tex",
  title = "Model: Exam Grade ~ School Mean × Sex + Environment + Bucharest"
)


model_flipped <- lm(mean_grade_school ~ sex * mean_grade + mediu + is_bucharest, data = df_model)
save_model_tex(
  model_flipped,
  file = "tables/model_school_vs_exam.tex",
  title = "Model: School Mean ~ Exam Grade × Sex + Environment + Bucharest"
)

summary(model_flipped)


county_stats <- df_model %>%
  group_by(judet, mediu) %>%
  summarize(
    median_exam = median(mean_grade, na.rm = TRUE),
    .groups = "drop"
  ) %>%
  pivot_wider(names_from = mediu, values_from = median_exam) %>%
  mutate(
    overall_median = rowMeans(across(c(rural, urban)), na.rm = TRUE),
    urban_rural_gap = urban - rural
  )


x_center <- median(county_stats$urban_rural_gap, na.rm = TRUE)
y_center <- median(county_stats$overall_median, na.rm = TRUE)

ggplot(county_stats, aes(x = urban_rural_gap, y = overall_median, label = judet)) +
  geom_point(color = "steelblue", size = 2.5, alpha = 0.8) +
  geom_text(nudge_x = 0.05, size = 3, alpha = 0.6, family = "Latin Modern Roman") +
  geom_vline(xintercept = x_center, linetype = "dashed", color = "gray50") +
  geom_hline(yintercept = y_center, linetype = "dotted", color = "gray50") +
  labs(
    x = "Urban − Rural Median Grade Gap",
    y = "County Median Exam Grade (Overall)"
  ) +
  coord_cartesian(ylim = c(5.5, 7.5))
  



county_level <- df_model %>%
  group_by(judet) %>%
  summarize(
    median_exam = median(mean_grade, na.rm = TRUE),
    pct_rural = mean(mediu == "rural"),
    .groups = "drop"
  )

summary(lm(median_exam ~ pct_rural, data = county_level))

save_model_tex(
  lm(median_exam ~ pct_rural, data = county_level),
  file = "tables/model_median_exam_pct_rural.tex",
  title = "Model: County Median Exam Grade ~ % Rural"
)


county_level <- county_level %>%
  mutate(is_bucharest = (judet == "B"))

summary(lm(median_exam ~ pct_rural + is_bucharest, data = county_level))

save_model_tex(
  lm(median_exam ~ pct_rural + is_bucharest, data = county_level),
  file = "tables/model_median_exam_rural_bucharest.tex",
  title = "Model: County Median Exam Grade ~ % Rural + Bucharest"
)



ggplot(county_level, aes(x = pct_rural*100, y = median_exam, label = judet)) +
  geom_point(color = "steelblue") +
  geom_text(nudge_y = 0.05, size = 3, alpha = 0.7, family = "Latin Modern Roman") +
  geom_smooth(method = "lm", se = FALSE, color = "darkred") +
  geom_point(data = filter(county_level, judet == "B"), color = "orange", size = 4) +
  labs(
    x = "% Rural Students",
    y = "Median Exam Grade"
  )


summary(lm(mean_grade ~ mediu + sex + mean_grade_school + is_bucharest + factor(judet), data = df_model))

save_model_tex(
  lm(mean_grade ~ mediu + sex + mean_grade_school + is_bucharest + factor(judet), data = df_model),
  file = "tables/model_exam_full_controls.tex",
  title = "Model: Exam Grade ~ Controls + County Fixed Effects"
)



# Count schools per town
town_school_counts <- df_model %>%
  distinct(localitate, school_code) %>%
  count(localitate) %>%
  filter(n >= 3)

# Filter df_model to only those towns
df_choice <- df_model %>%
  semi_join(town_school_counts, by = "localitate")


school_perf <- df_choice %>%
  group_by(judet, localitate, school_code) %>%
  summarize(median_exam = median(mean_grade, na.rm = TRUE), .groups = "drop")

town_variation <- school_perf %>%
  group_by(judet, localitate) %>%
  summarize(sd_between_schools = sd(median_exam, na.rm = TRUE), n_schools = n()) %>%
  filter(n_schools >= 3)

town_type <- df_choice %>%
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

# Merge for rural
geo_rural <- geo %>%
  left_join(
    filter(county_stratification, town_type == "rural"),
    by = c("mnemonic" = "judet")
  )

geo_rural$label_x <- centroids[,1]
geo_rural$label_y <- centroids[,2]

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

ggplot(geo_rural) +
  geom_sf(aes(fill = mean_sd), color = "white") +
  geom_text(
    aes(x = label_x, y = label_y, label = mnemonic),
    size = 3,
    color = "white",
    family = "Latin Modern Roman"
  ) +
  scale_fill_viridis_c(option = "mako", na.value = "grey90", name = "Rural\nSD", direction = -1) +
  theme_map()


school_counts <- town_variation %>%
  filter(!is.na(town_type)) %>%
  group_by(judet, town_type) %>%
  summarize(n_schools = sum(n_schools), .groups = "drop")

county_stratification <- county_stratification %>%
  left_join(school_counts, by = c("judet", "town_type"))

urban_plot_df <- county_stratification %>%
  filter(town_type == "urban")

ggplot(urban_plot_df, aes(x = n_schools, y = mean_sd, label = judet)) +
  geom_point(color = "steelblue", size = 3, alpha = 0.8) +
  geom_smooth(method = "lm", se = FALSE, linetype = "dashed", color = "darkred") +
  geom_text(nudge_y = 0.05, size = 3, alpha = 0.7, family = "Latin Modern Roman") +
  labs(
    x = "Number of Urban Schools (Towns with ≥3)",
    y = "Mean SD of Exam Grades Across Schools (Urban Towns)"
  )


bucharest_schools <- df_model %>%
  filter(judet == "B") %>%
  group_by(school_code) %>%
  summarize(
    median_exam = median(mean_grade, na.rm = TRUE),
    n_students = n(),
    mediu = first(mediu),
    proprietate = first(proprietate),  # public vs. private
    nume = first(nume)
  ) %>%
  arrange(desc(median_exam))


ggplot(bucharest_schools, aes(x = median_exam, fill = proprietate)) +
  geom_histogram(binwidth = 0.25, position = "identity", alpha = 0.7) +
  labs(
    x = "Median Exam Grade",
    y = "Number of Schools",
    fill = "Ownership"
  ) 


ggplot(bucharest_schools, aes(x = median_exam, weight = n_students, fill = proprietate)) +
  geom_histogram(binwidth = 0.25, position = "identity", alpha = 0.7) +
  labs(
    x = "Median Exam Grade",
    y = "Estimated Number of Students",
    fill = "Ownership"
  ) 


ggplot(bucharest_schools, aes(x = median_exam, weight = n_students, fill = proprietate)) +
  geom_density(alpha = 0.6, adjust = 1.2) +
  labs(
    x = "Median Exam Grade",
    y = "Weighted Density",
    fill = "Ownership"
  ) 


elite_public <- bucharest_schools %>%
  filter(proprietate == "publica", median_exam >= 9) %>%
  arrange(desc(median_exam))

elite_codes <- elite_public$school_code
elite_sd_table <- df_model %>%
  filter(school_code %in% elite_codes) %>%
  group_by(school_code) %>%
  summarize(
    sd_exam = sd(mean_grade, na.rm = TRUE),
    n_students = n(),
    median_exam = median(mean_grade, na.rm = TRUE),
    nume = first(nume)
  ) %>%
  arrange(desc(median_exam))

save_latex_table(
  tbl = elite_sd_table %>% select(nume, median_exam, sd_exam, n_students),
  file = "tables/elite_bucharest_schools_sd.tex",
  caption = "Elite Public Schools in Bucharest: Median and Dispersion of Exam Grades",
  digits = 2
)



school_medians_national <- df_model %>%
  group_by(school_code) %>%
  summarize(
    median_exam = median(mean_grade, na.rm = TRUE),
    proprietate = first(proprietate),
    judet = first(judet),
    nume = first(nume),
    .groups = "drop"
  )

cutoff_90_national <- quantile(school_medians_national$median_exam, probs = 0.90, na.rm = TRUE)

elite_schools_national <- school_medians_national %>%
  filter(median_exam >= cutoff_90_national) %>%
  arrange(desc(median_exam))


elite_schools_national %>%
  left_join(
    df_model %>% count(school_code, name = "n_students_total"),
    by = "school_code"
  ) %>%
  summarise(
    total_students_in_elite = sum(n_students_total),
    total_students_all = nrow(df_model),
    pct_students_in_elite = total_students_in_elite / total_students_all * 100
  ) %>%
  save_latex_table(
    file = "tables/national_elite_enrollment.tex",
    caption = 'How many students are in "elite" schools nationally',
    digits = 2
  )


library(jsonlite)

dem_data <- fromJSON("../data/demographics/total.json")

roma_df <- purrr::map_dfr(names(dem_data$cities), function(judet_code) {
  towns <- dem_data$cities[[judet_code]]$cities
  purrr::map_dfr(names(towns), function(town_name) {
    pop <- towns[[town_name]]$population
    total <- pop$total
    romi <- pop$ethnicity$romi
    tibble(
      judet = judet_code,
      localitate = town_name,
      pct_roma = 100 * romi / total
    )
  })
})

absentee_by_town <- df_full %>%
  group_by(judet, localitate, mediu) %>%
  summarize(
    n_total = n(),
    n_missing = sum(is.na(mean_grade)),
    pct_missing = 100 * mean(is.na(mean_grade))
  ) %>%
  ungroup()

absentee_with_roma <- absentee_by_town %>%
  inner_join(roma_df, by = c("judet", "localitate"))

# Now run correlation or plot
ggplot(absentee_with_roma, aes(x = pct_roma, y = pct_missing)) +
  geom_point(alpha = 0.5) +
  geom_smooth(method = "lm") +
  labs(
    x = "% Roma population",
    y = "% EN absentees",
  ) 


save_model_tex(
  lm(pct_missing ~ pct_roma + mediu + factor(judet), data = absentee_with_roma),
  file = "tables/model_absenteeism_roma.tex",
  title = "Model: Absenteeism ~ % Roma + Environment + County FE"
)

summary(lm(pct_missing ~ pct_roma + mediu + factor(judet), data = absentee_with_roma))


rural_absenteeism_by_county <- df_full %>%
  filter(mediu == "rural") %>%
  group_by(judet) %>%
  summarize(
    pct_missing = mean(is.na(mean_grade)) * 100,
    n_students = n()
  ) %>%
  arrange(desc(pct_missing))

geo_rural_absent <- geo %>%
  left_join(rural_absenteeism_by_county, by = c("mnemonic" = "judet"))

geo_rural_absent$label_x <- centroids[, 1]
geo_rural_absent$label_y <- centroids[, 2]

ggplot(geo_rural_absent) +
  geom_sf(aes(fill = pct_missing), color = "white") +
  geom_text(
    aes(x = label_x, y = label_y, label = mnemonic),
    size = 3,
    color = "white",
    family = "Latin Modern Roman"
  ) +
  scale_fill_gradient2(
  low = "white",  
  mid = "darkred",
  high = "black",     
  midpoint = 10,
  name = "% Absent"
) +
  labs(
    fill = "% Missing"
  ) +
  theme_map()

worst_absenteeism <- absentee_by_town %>%
  filter(judet %in% c("SM", "BR"), mediu == "rural") %>%
  arrange(desc(pct_missing))

# Now join with ethnicity data
rural_absenteeism_with_roma <- worst_absenteeism %>%
  left_join(roma_df, by = c("judet", "localitate"))




ggplot(rural_absenteeism_with_roma, aes(x = pct_roma, y = pct_missing)) +
  geom_point() +
  geom_smooth(method = "lm") +
  labs(
    x = "% Roma",
    y = "% Missing from EN"
  )


save_latex_table(
  tbl = worst_absenteeism %>% head(n = 5),
  file = "tables/top5_absenteeism_SM_BR.tex",
  caption = "Schools with highest absenteeism in SM and BR",
  digits = 2
)


phantom_schools <- df_full %>%
  group_by(school_code, nume, localitate, judet, proprietate, mediu) %>%
  summarize(
    n_total = n(),
    n_missing = sum(is.na(mean_grade)),
    pct_missing = 100 * n_missing / n_total,
    .groups = "drop"
  ) %>%
  filter(pct_missing >= 70) %>%
  arrange(desc(pct_missing))

phantom_summary <- phantom_schools %>%
  summarize(
    total_schools = n(),
    total_students = sum(n_total),
    total_missing = sum(n_missing),
    avg_absenteeism = mean(pct_missing)
  ) %>%
  save_latex_table(
  file = "tables/phantom_schools_summary.tex",
  caption = "Phantom schools summary",
  digits = 2
)



# Create a range of absenteeism thresholds
thresholds <- seq(100, 0, by = -5)

absentee_by_school <- df_full %>%
  group_by(school_code, nume, judet, localitate, mediu) %>%
  filter(judet != "B") %>%
  summarize(
    n_total = n(),
    n_missing = sum(is.na(mean_grade)),
    pct_missing = 100 * mean(is.na(mean_grade)),
    .groups = "drop"
  )

total_missing_all <- sum(absentee_by_school$n_missing, na.rm = TRUE)

threshold_summary <- purrr::map_dfr(thresholds, function(t) {
  absentee_by_school %>%
    filter(pct_missing >= t) %>%
    summarize(
      threshold = t,
      phantom_missing = sum(n_missing, na.rm = TRUE)
    )
}) %>%
  mutate(
    pct_missing_share = phantom_missing / total_missing_all * 100
  )


ggplot(threshold_summary, aes(x = threshold, y = pct_missing_share)) +
  geom_line(color = "firebrick", linewidth = 1.2) +
  geom_point(color = "black") +
  geom_hline(yintercept = 50, linetype = "dashed", color = "gray40") +
  scale_x_reverse() +
  labs(
    x = "School Absenteeism Threshold (%)",
    y = "Cumulative % of National Absentees"
  ) 




high_absentee_county <- absentee_by_school %>%
  filter(pct_missing >= 25, judet != "B") %>%
  group_by(judet) %>%
  summarize(
    num_phantomish_schools = n(),
    total_missing = sum(n_missing),
    .groups = "drop"
  )

total_schools_by_county <- absentee_by_school %>%
  group_by(judet) %>%
  filter(judet != "B") %>%
  summarize(
    total_schools = n(),
    .groups = "drop"
  )

high_absentee_pct_county <- high_absentee_county %>%
  left_join(total_schools_by_county, by = "judet") %>%
  mutate(
    pct_high_absentee_schools = 100 * num_phantomish_schools / total_schools
  )


geo_phantomish <- geo %>%
  left_join(high_absentee_pct_county, by = c("mnemonic" = "judet"))

geo_phantomish$label_x <- centroids[, 1]
geo_phantomish$label_y <- centroids[, 2]

ggplot(geo_phantomish) +
  geom_sf(aes(fill = pct_high_absentee_schools), color = "white") +
  geom_text(aes(x = label_x, y = label_y, label = mnemonic), size = 3, color = "white", family = "Latin Modern Roman") +
  scale_fill_gradient2(
  low = "white",  
  mid = "darkred",
  high = "black",     
  midpoint = 10,
  name = "% of county schools\nwith over 25% absent students"
) +
  theme_map()


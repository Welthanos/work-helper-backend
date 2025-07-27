export function calculateLombalgyRisk(details: any): number {
    const { worker_age, load_unitization_n, has_package_grip, trunk_flexion_angle, trunk_rotation_angle, distance_traveled_m, lifting_frequency_per_min, load_weight_kg, work_shift_hours, service_time_years, worker_weight_kg } = details;

    const gX = -271 +
        (1.85 * worker_age) +
        (2.83 * load_unitization_n) +
        (1.54 * has_package_grip ? 1 : 0) +
        (1.39 * trunk_flexion_angle) +
        (1.21 * trunk_rotation_angle) +
        (0.85 * distance_traveled_m) +
        (0.77 * lifting_frequency_per_min) +
        (0.63 * load_weight_kg) +
        (0.45 * work_shift_hours) +
        (0.29 * service_time_years) +
        (0.13 * worker_weight_kg);

    const pY = 1 / (1 + Math.exp(-gX));
    const calculatedRisk = Number((pY * 100).toFixed(2));

    return calculatedRisk;
}

export function getRecommendationCodes(details: any, sex: 'M' | 'F'): string[] {
    const codes: string[] = [];

    if (details.worker_age < 30) codes.push('AGE_LT_30');
    else if (details.worker_age <= 50) codes.push('AGE_30_50');
    else codes.push('AGE_GT_50');

    if (details.load_unitization_n === 1) codes.push('UNIT_1');
    else if (details.load_unitization_n <= 3) codes.push('UNIT_2_3');
    else codes.push('UNIT_GT_3');

    if (details.has_package_grip) codes.push('GRIP_YES');
    else codes.push('GRIP_NO');

    if (details.trunk_flexion_angle <= 20) codes.push('FLEX_0_20');
    else if (details.trunk_flexion_angle <= 45) codes.push('FLEX_20_45');
    else codes.push('FLEX_GT_45');

    if (details.trunk_rotation_angle < 15) codes.push('ROT_LT_15');
    else if (details.trunk_rotation_angle <= 30) codes.push('ROT_16_30');
    else codes.push('ROT_GT_30');

    if (details.distance_traveled_m < 5) codes.push('DIST_LT_5');
    else if (details.distance_traveled_m <= 10) codes.push('DIST_5_10');
    else codes.push('DIST_GT_10');

    if (details.lifting_frequency_per_min < 1) codes.push('FREQ_LT_1');
    else if (details.lifting_frequency_per_min <= 3) codes.push('FREQ_2_3');
    else codes.push('FREQ_GT_12');

    if (details.load_weight_kg <= 20) codes.push('LOAD_LTE_20');
    else if (details.load_weight_kg <= 30) codes.push('LOAD_21_30');
    else codes.push('LOAD_GT_31');

    if (details.work_shift_hours <= 8) codes.push('SHIFT_LTE_8');
    else if (details.work_shift_hours <= 10) codes.push('SHIFT_8_10');
    else codes.push('SHIFT_GT_10');

    if (details.service_time_years < 5) codes.push('SERVICE_LT_5');
    else if (details.service_time_years <= 10) codes.push('SERVICE_6_10');
    else codes.push('SERVICE_GT_10');

    if (sex === 'M')
        if (details.worker_weight_kg <= 70) codes.push('BWEIGHT_H_LTE_70');
        else if (details.worker_weight_kg <= 90) codes.push('BWEIGHT_H_70_90');
        else codes.push('BWEIGHT_H_GT_90');
    else
        if (details.worker_weight_kg <= 60) codes.push('BWEIGHT_M_LTE_60');
        else if (details.worker_weight_kg <= 80) codes.push('BWEIGHT_M_60_80');
        else codes.push('BWEIGHT_M_GT_80');

    return codes;
}
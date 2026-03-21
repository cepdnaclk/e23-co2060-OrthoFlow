package com.devforge.orthoflow.Application.dto.request;

import lombok.Data;

import java.time.LocalDate;

@Data
public class CreatePatientDto {



    private String patientNumber;
    private String firstName;
    private String lastName;
    private String gender;
    private LocalDate dateOfBirth;
    private Integer age;
    private String nic;
    private String address;
    private String phone;
    private String email;
    private String guardianName;
    private String guardianPhone;

}

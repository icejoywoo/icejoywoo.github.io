import com.example.tutorial.AddressBookProtosV2.AddressBookV2;
import com.example.tutorial.AddressBookProtosV2.PersonV2;
import java.io.FileInputStream;

class ListPeople {
    // Iterates though all people in the AddressBook and prints info about them.
    // 测试 protobuf message 等名字不同，是否可以正常解析，测试结果是可以正常读取的
    static void Print(AddressBookV2 addressBook) {
        for (PersonV2 person: addressBook.getPersonList()) {
            System.out.println("Person ID: " + person.getId());
            System.out.println("  Name: " + person.getName());
            if (person.hasEmail()) {
                System.out.println("  E-mail address: " + person.getEmail());
            }

            for (PersonV2.PhoneNumber phoneNumber : person.getPhoneList()) {
                switch (phoneNumber.getType()) {
                    case MOBILE:
                        System.out.print("  Mobile phone #: ");
                        break;
                    case HOME:
                        System.out.print("  Home phone #: ");
                        break;
                    case WORK:
                        System.out.print("  Work phone #: ");
                        break;
                }
                System.out.println(phoneNumber.getNumber());
            }
        }
    }

    // Main function:  Reads the entire address book from a file and prints all
    //   the information inside.
    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            System.err.println("Usage:  ListPeople ADDRESS_BOOK_FILE");
            System.exit(-1);
        }

        // Read the existing address book.
        AddressBookV2 addressBook =
                AddressBookV2.parseFrom(new FileInputStream(args[0]));

        Print(addressBook);
    }
}
